import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const schema = z.object({
  role: z.enum(['creator', 'brand']),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const role = parsed.data.role;
  const userId = session.user.id;

  const result = await db.$transaction(async (tx) => {
    const changed = await tx.user.updateMany({
      where: { id: userId, OR: [{ role: null }, { role }] },
      data: { role },
    });
    if (!changed.count) return false;
    if (role === 'creator')
      await tx.creatorProfile.upsert({ where: { userId }, update: {}, create: { userId } });
    else
      await tx.brandProfile.upsert({
        where: { userId },
        update: {},
        create: { userId, company: 'My Company' },
      });
    return true;
  });
  if (!result)
    return NextResponse.json(
      { error: 'This account already has a different role.' },
      { status: 409 },
    );

  return NextResponse.json({ ok: true, role });
}
