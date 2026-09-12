import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { trackServerEventFireAndForget } from '@/lib/analytics';

const schema = z.object({
  // Brand actions: shortlist, accept, reject, withdraw (withdraw cancels
  // an unanswered invite).
  // Creator actions: accept_invite (flip to 'pending', with a proposed rate
  // supplied separately), decline_invite (flip to 'withdrawn').
  action: z.enum([
    'shortlist',
    'accept',
    'reject',
    'withdraw',
    'accept_invite',
    'decline_invite',
  ]),
  // Creator supplies a proposed rate when accepting an invite. The
  // minimum mirrors /api/applications (free proposals); a real rate is
  // what the brand needs to decide on.
  proposedRate: z.number().int().min(0).max(2147483647).optional(),
  pitch: z.string().trim().min(20).max(2000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!user?.role) return NextResponse.json({ error: 'Pick a role first.' }, { status: 409 });
  const isBrand = user.role === 'brand';
  const isCreator = user.role === 'creator';

  // Creator-side: accept or decline an invite. Brand and creator share the
  // endpoint but the action vocabulary is disjoint.
  if (parsed.data.action === 'accept_invite' || parsed.data.action === 'decline_invite') {
    if (!isCreator) return NextResponse.json({ error: 'Not a creator account' }, { status: 403 });
    const rate = parsed.data.proposedRate ?? 0;
    if (parsed.data.action === 'accept_invite' && (rate <= 0 || !parsed.data.pitch)) {
      return NextResponse.json(
        { error: 'Share your proposed rate and a short pitch to accept.' },
        { status: 400 },
      );
    }
    const target = parsed.data.action === 'accept_invite' ? 'pending' : 'withdrawn';
    const updated = await db.application.updateMany({
      where: { id, creatorId: session.user.id, status: 'invited' },
      data: {
        status: target,
        proposedRate: rate,
        pitch: parsed.data.pitch ?? null,
      },
    });
    if (!updated.count) {
      return NextResponse.json(
        { error: 'This invite is no longer open.' },
        { status: 409 },
      );
    }
    trackServerEventFireAndForget(session.user.id, 'application_status_changed', {
      applicationId: id,
      newStatus: target,
    });
    return NextResponse.json({ ok: true, status: target });
  }

  // The remaining actions are brand-only.
  if (!isBrand) return NextResponse.json({ error: 'Not a brand account' }, { status: 403 });
  // At this point the only remaining brand actions are shortlist / accept /
  // reject / withdraw. We narrow for the closure.
  const action = parsed.data.action;

  const outcome = await db.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!application) return { error: 'Application not found', status: 404 };
    if (application.campaign.brandId !== session.user.id)
      return { error: 'Not your campaign', status: 403 };

    // Withdrawing an invite is its own path: it only applies to 'invited' status
    // and stores 'withdrawn' so the brand can cancel an unanswered invite.
    if (action === 'withdraw') {
      if (application.status !== 'invited')
        return { error: 'Only open invites can be withdrawn.', status: 409 };
      const updated = await tx.application.updateMany({
        where: { id, status: 'invited' },
        data: { status: 'withdrawn' },
      });
      if (!updated.count) return { error: 'This invite has already been decided.', status: 409 };
      return { body: { ok: true, status: 'withdrawn' } };
    }

    const status = (
      { shortlist: 'shortlisted', accept: 'accepted', reject: 'rejected' } as const
    )[action as 'shortlist' | 'accept' | 'reject'];
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
        // Start in pending_signature; the creator signs to flip to active.
        // The brand has effectively signed by accepting the proposal here.
        status: 'pending_signature',
        escrowState: 'pending',
        brandSignedAt: new Date(),
        milestones: {
          create: {
            title: 'Full deliverables',
            amount: application.proposedRate,
            status: 'pending',
          },
        },
      },
    });
    return {
      body: { ok: true, status, contractId: contract.id },
      event: {
        kind: 'contract_created' as const,
        actor: session.user.id,
        contractId: contract.id,
        agreedRate: application.proposedRate,
      },
    };
  });
  if ('error' in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  if (
    outcome.body &&
    (outcome as { event?: { kind: string } }).event?.kind === 'contract_created'
  ) {
    const e = (outcome as {
      event: { kind: 'contract_created'; actor: string; contractId: string; agreedRate: number };
    }).event;
    trackServerEventFireAndForget(e.actor, 'contract_created', {
      contractId: e.contractId,
      agreedRate: e.agreedRate,
    });
    const creatorRow = await db.application.findUnique({
      where: { id },
      select: { creatorId: true },
    });
    if (creatorRow) {
      trackServerEventFireAndForget(creatorRow.creatorId, 'contract_created', {
        contractId: e.contractId,
        agreedRate: e.agreedRate,
      });
    }
  }
  return NextResponse.json(outcome.body);
}
