// Append-only audit log. Every state change that matters (contracts,
// payments, KYC) writes a row here. Append-only, never updated, never
// deleted. When a dispute reaches "she says she approved it, he says she
// didn't," this is the only thing that resolves it.

import { db } from '@/lib/db';

export type AuditActorType = 'user' | 'admin' | 'system' | 'webhook';

/**
 * The transaction handle has the same shape as `db.auditEvent` plus the
 * rest of the model API. We use a structural type so the helper accepts
 * either `db` or the value passed to a `db.$transaction` callback.
 */
// The transaction handle has the same shape as `db.auditEvent` plus the
// rest of the model API. We use `any` for the create method to avoid
// fighting Prisma's overload-heavy generated types when we just need a
// pass-through.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuditHandle = { auditEvent: { create: (args: { data: any }) => Promise<any> } };

export type RecordAuditArgs = {
  actorType: AuditActorType;
  actorId?: string | null;
  // "contract.signed" | "kyc.approved" | "escrow.released" | ...
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

export async function recordAudit(
  args: RecordAuditArgs,
  tx?: AuditHandle,
): Promise<void> {
  const handle = tx ?? db;
  await handle.auditEvent.create({
    data: {
      actorType: args.actorType,
      actorId: args.actorId ?? null,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      before: args.before === undefined ? null : JSON.stringify(args.before),
      after: args.after === undefined ? null : JSON.stringify(args.after),
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
    },
  });
}
