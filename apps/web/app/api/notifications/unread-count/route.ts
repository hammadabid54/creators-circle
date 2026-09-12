// GET /api/notifications/unread-count
// Returns the signed-in user's unread notification count. Used by the
// workspace bell badge to update in the background.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { unreadCount, drainDeliveries } from '@/lib/notifications';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }
  // Drain on read so the badge updates close to real time in dev. In
  // production a cron drives this; the read is a best-effort catch-up.
  await drainDeliveries({ take: 25 }).catch(() => undefined);
  const count = await unreadCount(session.user.id);
  return NextResponse.json({ count });
}
