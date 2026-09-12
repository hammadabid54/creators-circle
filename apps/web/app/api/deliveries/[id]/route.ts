import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { markContractCompletedOrPendingPayout } from '@/lib/contract-lifecycle';
import { NextResponse } from 'next/server';
import { z } from 'zod';
const url = z
  .string()
  .url()
  .max(2000)
  .refine((v) => /^https?:\/\//i.test(v), 'Use an HTTP or HTTPS link.');
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('submit'),
    milestoneId: z.string().min(1),
    links: z.array(url).min(1).max(10),
    notes: z.string().trim().max(2000).default(''),
  }),
  z.object({
    action: z.enum(['approve', 'revise']),
    submissionId: z.string().min(1),
    feedback: z.string().trim().max(2000).default(''),
  }),
]);
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Check your submission.' },
      { status: 400 },
    );
  const d = parsed.data;
  if (d.action === 'revise' && !d.feedback)
    return NextResponse.json({ error: 'Explain what needs to change.' }, { status: 400 });
  const actor = session.user.id;
  const result = await db.$transaction(async (tx) => {
    // Obtain the write lock before reading the current delivery state.
    const lock = await tx.contract.updateMany({
      where: {
        id,
        OR: [{ creatorId: actor }, { brandId: actor }],
        status: { in: ['active', 'pending_funding'] },
      },
      data: { updatedAt: new Date() },
    });
    if (!lock.count) return { error: 'This collaboration is unavailable or closed.', status: 409 };
    const contract = await tx.contract.findUniqueOrThrow({ where: { id } });
    if (d.action === 'submit') {
      if (contract.creatorId !== actor)
        return { error: 'Only the creator can submit work.', status: 403 };
      const changed = await tx.milestone.updateMany({
        where: {
          id: d.milestoneId,
          contractId: id,
          status: { in: ['pending', 'revision_requested'] },
        },
        data: { status: 'submitted' },
      });
      if (!changed.count)
        return {
          error: 'This deliverable is already in review or approved. Refresh to see its status.',
          status: 409,
        };
      await tx.contentSubmission.create({
        data: {
          contractId: id,
          milestoneId: d.milestoneId,
          fileUrls: JSON.stringify(d.links),
          caption: d.notes || null,
        },
      });
    } else {
      if (contract.brandId !== actor)
        return { error: 'Only the brand can review work.', status: 403 };
      const submission = await tx.contentSubmission.findFirst({
        where: { id: d.submissionId, contractId: id, status: 'pending' },
      });
      if (!submission?.milestoneId)
        return {
          error: 'This submission has already been reviewed or is unavailable.',
          status: 409,
        };
      const changed = await tx.milestone.updateMany({
        where: { id: submission.milestoneId, contractId: id, status: 'submitted' },
        data: { status: d.action === 'approve' ? 'approved' : 'revision_requested' },
      });
      if (!changed.count)
        return { error: 'The deliverable changed. Refresh before reviewing.', status: 409 };
      await tx.contentSubmission.update({
        where: { id: submission.id },
        data: { status: d.action === 'approve' ? 'approved' : 'rejected' },
      });
      await tx.deliveryReview.create({
        data: {
          submissionId: submission.id,
          reviewerId: actor,
          action: d.action,
          feedback: d.feedback,
        },
      });
      if (
        d.action === 'approve' &&
        (await tx.milestone.count({ where: { contractId: id, status: { not: 'approved' } } })) === 0
      ) {
        // Final approval only closes the contract when no money is in flight.
        // When escrow is funded or held, the contract moves to
        // 'pending_payout' and waits for the release webhook to close it.
        // Today, escrowState is always 'pending' so this preserves the
        // existing behavior. The day escrow lands, the gate activates
        // without further code change here.
        await markContractCompletedOrPendingPayout(
          {
            contractId: id,
            escrowState: contract.escrowState as
              | 'pending'
              | 'funded'
              | 'held'
              | 'released'
              | 'refunded',
          },
          tx,
        );
      }
    }
    return { ok: true, status: 200 };
  });
  if ('ok' in result) {
    revalidateTag('discovery');
    // Invalidate the contract pages for both sides so the new milestone
    // status / submission / review state shows up on next render. Without
    // this, Next.js serves the cached page and the brand keeps seeing the
    // old "Awaiting submission" state even though the creator has
    // already submitted.
    revalidatePath(`/brand/contracts/${id}`);
    revalidatePath(`/creator/contracts/${id}`);
    revalidatePath('/brand/contracts');
    revalidatePath('/creator/contracts');
    revalidatePath(`/brand/dashboard`);
    revalidatePath(`/creator/dashboard`);
  }
  return NextResponse.json(result, { status: result.status });
}
