// Lifecycle helpers for moving a contract through its terminal state.
// Kept here so the deliveries route and the eventual payout-release worker
// (when escrow lands) share the same transition logic.

import { db } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

type EscrowState = 'pending' | 'funded' | 'held' | 'released' | 'refunded';

/**
 * Called when escrow for a contract has fully released (every escrow intent
 * in 'released' state, or the partner has confirmed final settlement). If
 * the contract is in 'pending_payout' and all milestones are still approved,
 * close it. Safe to call repeatedly and to call from inside another
 * transaction by passing the tx handle.
 */
export async function completeContractIfPayoutDone(
  contractId: string,
  tx?: Tx,
): Promise<void> {
  const runner = async (handle: Tx) => {
    const contract = await handle.contract.findUnique({
      where: { id: contractId },
      select: { id: true, status: true, escrowState: true },
    });
    if (!contract) return;
    if (contract.status !== 'pending_payout') return;
    if (contract.escrowState !== 'released') return;
    const open = await handle.milestone.count({
      where: { contractId, status: { not: 'approved' } },
    });
    if (open > 0) return;
    await handle.contract.update({
      where: { id: contractId },
      data: { status: 'completed' },
    });
  };
  if (tx) return runner(tx);
  await db.$transaction(runner);
}

/**
 * Mark a contract 'pending_payout' (or 'completed' if no escrow was ever
 * funded). Used by the deliveries route on final milestone approval. Pass
 * the active tx when called from inside another $transaction so the writes
 * stay in one transaction and don't race the outer timeout.
 */
export async function markContractCompletedOrPendingPayout(
  args: { contractId: string; escrowState: EscrowState },
  tx?: Tx,
): Promise<{ status: 'completed' | 'pending_payout' }> {
  const nextStatus: 'completed' | 'pending_payout' =
    args.escrowState === 'funded' || args.escrowState === 'held'
      ? 'pending_payout'
      : 'completed';
  const handle = tx ?? db;
  await handle.contract.update({
    where: { id: args.contractId },
    data: { status: nextStatus },
  });
  return { status: nextStatus };
}
