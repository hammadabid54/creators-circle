// POST /api/notifications/mark-read
// Body: { ids: string[] }. Marks the listed notifications read for the
// signed-in user. Returns the count of rows actually updated.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { markNotificationsRead } from '@/lib/notifications';

const schema = z.object({
  ids: z.array(z.string().min(1)).max(200),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pass a list of notification ids.' }, { status: 400 });
  }
  const count = await markNotificationsRead(session.user.id, parsed.data.ids);
  return NextResponse.json({ ok: true, count });
}
