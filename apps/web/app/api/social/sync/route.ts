import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { syncYouTubeAccount } from '@/lib/youtube-metrics';
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'creator')
    return NextResponse.json({ error: 'Not a creator' }, { status: 403 });
  const parsed = z
    .object({
      platform: z.enum(['instagram', 'youtube', 'tiktok', 'facebook', 'all']).default('all'),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const accounts = await db.socialAccount.findMany({
    where: {
      creator: { userId: session.user.id },
      ...(parsed.data.platform === 'all' ? {} : { platform: parsed.data.platform }),
    },
  });
  if (!accounts.length)
    return NextResponse.json({ error: 'Connect an account first.' }, { status: 404 });
  let synced = 0;
  const issues: string[] = [];
  for (const account of accounts) {
    if (account.platform !== 'youtube' || account.connectionState === 'dev_mock') {
      issues.push(account.platform + ': live refresh is not available for this connection.');
      continue;
    }
    try {
      await syncYouTubeAccount(account.id);
      synced++;
    } catch (error) {
      issues.push(error instanceof Error ? error.message : 'Refresh failed.');
    }
  }
  return NextResponse.json(
    { ok: synced > 0, synced, issues, ...(!synced ? { error: issues.join(' ') } : {}) },
    { status: synced ? 200 : 503 },
  );
}
