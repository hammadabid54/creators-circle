// Notifications + audit. The schema follows the reviewer's recommendation:
// a Notification row per event, per-user; a NotificationDelivery row per
// channel; and an append-only AuditEvent for every state change that
// matters (contracts, payments, KYC).
//
// The delivery pattern is the transactional outbox: emitNotification()
// runs in the same transaction as the business event, and a tiny
// in-process worker drains NotificationDelivery rows. In production this
// would be a separate cron or queue worker; for now we drain inline so
// the dev experience is end-to-end. WhatsApp is stubbed until Meta
// approves the templates; the rest of the channels (in-app, email) work.

import { db } from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/email-delivery';

export type NotificationType =
  | 'application.invited'
  | 'application.status_changed'
  | 'application.shortlisted'
  | 'contract.signed'
  | 'work.submitted'
  | 'milestone.approved'
  | 'milestone.revision_requested'
  | 'message.received'
  | 'invite.received'
  | 'kyc.status_changed'
  | 'dispute.opened'
  | 'dispute.resolved';

export type NotificationPayload = Record<string, string | number | boolean | null>;

type Channel = 'inapp' | 'email' | 'whatsapp' | 'sms';

const DEFAULT_CHANNELS: Record<NotificationType, Channel[]> = {
  'application.invited': ['inapp', 'email', 'whatsapp'],
  'application.status_changed': ['inapp', 'whatsapp'],
  'application.shortlisted': ['inapp', 'whatsapp'],
  'contract.signed': ['inapp', 'email', 'whatsapp'],
  'work.submitted': ['inapp', 'whatsapp'],
  'milestone.approved': ['inapp', 'email', 'whatsapp'],
  'milestone.revision_requested': ['inapp', 'whatsapp'],
  'message.received': ['inapp'], // messaging has its own inbox; we don't email every message
  'invite.received': ['inapp', 'email', 'whatsapp'],
  'kyc.status_changed': ['inapp', 'email'],
  'dispute.opened': ['inapp', 'email', 'whatsapp'],
  'dispute.resolved': ['inapp', 'email', 'whatsapp'],
};

/**
 * Emit a notification for one user. Must be called inside a $transaction
 * so the Notification row and the business event commit together.
 * Use the returned `notificationId` after the transaction to schedule
 * delivery (the in-process worker handles it).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function emitNotification(tx: any, args: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  payload?: NotificationPayload;
}) {
  const n = await tx.notification.create({
    data: {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body ?? null,
      payload: JSON.stringify(args.payload ?? {}),
      deliveries: {
        create: DEFAULT_CHANNELS[args.type].map((channel: Channel) => ({ channel })),
      },
    },
    select: { id: true, userId: true, type: true, title: true, body: true, payload: true },
  });
  return n;
}

/**
 * Drain queued NotificationDelivery rows. Cheap and inline; can be
 * called from a /api/notifications/cron route, a Vercel cron, or
 * inline after a request returns. Idempotent.
 */
export async function drainDeliveries(opts: { take?: number } = {}): Promise<{
  attempted: number;
  sent: number;
  failed: number;
}> {
  const take = opts.take ?? 50;
  const rows = await db.notificationDelivery.findMany({
    where: { status: 'queued', sendAfter: { lte: new Date() } },
    include: { notification: true },
    take,
    orderBy: { createdAt: 'asc' },
  });
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await deliverOne(row.id, row.channel as Channel, {
        email: (await emailForUser(row.notification.userId)) ?? undefined,
        phone: (await phoneForUser(row.notification.userId)) ?? undefined,
        body: row.notification.body,
        title: row.notification.title,
      });
      await db.notificationDelivery.update({
        where: { id: row.id },
        data: { status: 'sent', sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      await db.notificationDelivery.update({
        where: { id: row.id },
        data: {
          status: row.attempts >= 3 ? 'failed' : 'queued',
          attempts: { increment: 1 },
          error: err instanceof Error ? err.message : 'unknown',
          sendAfter: new Date(Date.now() + 60_000 * Math.max(1, row.attempts)),
        },
      });
      failed++;
    }
  }
  return { attempted: rows.length, sent, failed };
}

async function deliverOne(
  deliveryId: string,
  channel: Channel,
  args: { email?: string; phone?: string; title: string; body: string | null },
) {
  switch (channel) {
    case 'inapp':
      // In-app deliveries are written in the same transaction as the
      // Notification, so the read state is what tracks delivery. Nothing
      // to do here.
      return;
    case 'email': {
      if (!args.email) throw new Error('no email on file');
      await sendTransactionalEmail({
        to: args.email,
        subject: args.title,
        text: args.body || args.title,
      });
      return;
    }
    case 'whatsapp':
      // Stub: real sending needs Meta WhatsApp Business template approval.
      // Until that comes through, log the intent so the team can see what
      // would have been sent in dev / staging.
      console.info(
        `[whatsapp:stub] would send to ${args.phone ?? 'unknown'}: ${args.title}`,
      );
      return;
    case 'sms':
      console.info(
        `[sms:stub] would send to ${args.phone ?? 'unknown'}: ${args.title}`,
      );
      return;
  }
}

async function emailForUser(userId: string): Promise<string | null> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  return u?.email ?? null;
}

async function phoneForUser(userId: string): Promise<string | null> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { phone: true } });
  return u?.phone ?? null;
}

/**
 * Mark notifications read. Single-user endpoint, takes a list of ids.
 */
export async function markNotificationsRead(userId: string, ids: string[]) {
  if (ids.length === 0) return 0;
  const res = await db.notification.updateMany({
    where: { id: { in: ids }, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}

/**
 * Unread count helper for badges.
 */
export async function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}
