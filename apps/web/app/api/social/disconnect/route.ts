import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const schema = z.object({
  platform: z.enum(['instagram', 'youtube', 'tiktok', 'facebook']),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: 'No creator profile' }, { status: 404 });
  }

  await db.socialAccount.deleteMany({
    where: { creatorId: profile.id, platform: parsed.data.platform },
  });

  return NextResponse.json({ ok: true });
}
