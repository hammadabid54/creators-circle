// GET /api/notifications/list?limit=10
// Returns the most recent notifications for the signed-in user. Powers
// the bell dropdown in the header.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { drainDeliveries } from '@/lib/notifications';

const MAX_LIMIT = 25;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ items: [], unreadCount: 0 });
  }
  await drainDeliveries({ take: 25 }).catch(() => undefined);

  const url = new URL(req.url);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get('limit') || '10')),
  );

  const items = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      payload: true,
      readAt: true,
      createdAt: true,
    },
  });

  const unreadCount = await db.notification.count({
    where: { userId: session.user.id, readAt: null },
  });

  const itemsOut = items.map((i) => {
    let parsed: Record<string, string | number | boolean | null> = {};
    try {
      parsed = JSON.parse(i.payload) as typeof parsed;
    } catch {
      // ignore malformed JSON
    }
    return {
      id: i.id,
      type: i.type,
      title: i.title,
      body: i.body,
      payload: parsed,
      read: i.readAt !== null,
      createdAt: i.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ items: itemsOut, unreadCount });
}
