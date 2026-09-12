// POST /api/contracts/[id]/sign
// The creator confirms they accept the terms of the contract proposed by
// the brand. Flips status from 'pending_signature' to 'active' once both
// parties have signed.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { trackServerEventFireAndForget } from '@/lib/analytics';
import { emitNotification } from '@/lib/notifications';
import { recordAudit } from '@/lib/audit';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const contract = await db.contract.findUnique({
    where: { id },
    select: { id: true, creatorId: true, brandId: true, status: true, brandSignedAt: true, agreedRate: true },
  });
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Only the assigned creator can sign. The brand is considered to have
  // signed when they accepted the proposal.
  if (contract.creatorId !== session.user.id) {
    return NextResponse.json({ error: 'Only the assigned creator can sign' }, { status: 403 });
  }
  if (contract.status !== 'pending_signature') {
    return NextResponse.json(
      { error: 'This contract is no longer waiting for a signature.' },
      { status: 409 },
    );
  }
  if (!contract.brandSignedAt) {
    // Defensive: shouldn't happen in normal flow because accept-proposal
    // sets brandSignedAt, but be explicit.
    return NextResponse.json(
      { error: 'The brand has not yet signed this contract.' },
      { status: 409 },
    );
  }

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.contract.update({
      where: { id, status: 'pending_signature' },
      data: { status: 'active', creatorSignedAt: new Date() },
      select: { id: true, status: true, creatorSignedAt: true, brandId: true, creatorId: true, agreedRate: true },
    });
    await recordAudit(
      {
        actorType: 'user',
        actorId: session.user.id,
        action: 'contract.signed',
        entityType: 'Contract',
        entityId: id,
        before: { status: 'pending_signature' },
        after: { status: 'active', creatorSignedAt: u.creatorSignedAt },
      },
      tx,
    );
    await emitNotification(tx, {
      userId: u.brandId,
      type: 'contract.signed',
      title: 'Contract signed — work can begin',
      body: 'The creator has signed the contract. You can fund the work and start collaborating.',
      payload: { contractId: id, agreedRate: u.agreedRate },
    });
    return u;
  });

  // Time-to-first-contract on the brand side is the single best
  // predictor of retention. Fire the event the moment the contract
  // goes active.
  trackServerEventFireAndForget(contract.creatorId, 'contract_signed', {
    contractId: id,
    agreedRate: contract.agreedRate,
  });
  trackServerEventFireAndForget(contract.brandId, 'contract_signed', {
    contractId: id,
    agreedRate: contract.agreedRate,
  });

  return NextResponse.json({ ok: true, contract: updated });
}
