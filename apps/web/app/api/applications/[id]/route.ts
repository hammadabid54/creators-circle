import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
const schema = z.object({ action: z.enum(['shortlist', 'accept', 'reject']) });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'brand') return NextResponse.json({ error: 'Not a brand' }, { status: 403 });
  const outcome = await db.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!application) return { error: 'Application not found', status: 404 };
    if (application.campaign.brandId !== session.user.id)
      return { error: 'Not your campaign', status: 403 };
    const status = { shortlist: 'shortlisted', accept: 'accepted', reject: 'rejected' }[
      parsed.data.action
    ];
    const updated = await tx.application.updateMany({
      where: { id, status: { in: ['pending', 'shortlisted'] } },
      data: { status },
    });
    if (!updated.count) return { error: 'This proposal has already been decided.', status: 409 };
    if (status !== 'accepted') return { body: { ok: true, status } };
    const contract = await tx.contract.create({
      data: {
        campaignId: application.campaignId,
        creatorId: application.creatorId,
        brandId: session.user.id,
        agreedRate: application.proposedRate,
        deliverables: application.campaign.deliverables,
        status: 'pending_funding',
        escrowState: 'pending',
        milestones: {
          create: {
            title: 'Full deliverables',
            amount: application.proposedRate,
            status: 'pending',
          },
        },
      },
    });
    return { body: { ok: true, status, contractId: contract.id } };
  });
  return 'error' in outcome
    ? NextResponse.json({ error: outcome.error }, { status: outcome.status })
    : NextResponse.json(outcome.body);
}
