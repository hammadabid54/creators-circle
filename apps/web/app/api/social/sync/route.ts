import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { syncYouTubeAccount } from '@/lib/youtube-metrics';
import { syncInstagramAccount, syncFacebookAccount } from '@/lib/meta-metrics';
import { syncTikTokAccount } from '@/lib/tiktok-metrics';

/**
 * Manual creator-triggered sync. Loops through the requesting creator's
 * connected (non-dev-mock) social accounts and refreshes each one. Returns
 * a per-account summary so the UI can show partial success.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'creator') {
    return NextResponse.json({ error: 'Not a creator' }, { status: 403 });
  }

  const parsed = z
    .object({
      platform: z
        .enum(['instagram', 'facebook', 'youtube', 'tiktok', 'all'])
        .default('all'),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const accounts = await db.socialAccount.findMany({
    where: {
      creator: { userId: session.user.id },
      connectionState: { not: 'dev_mock' },
      ...(parsed.data.platform === 'all' ? {} : { platform: parsed.data.platform }),
    },
  });
  if (!accounts.length) {
    return NextResponse.json(
      { error: 'No connected accounts to sync. Connect a platform first.' },
      { status: 404 },
    );
  }

  let synced = 0;
  const issues: string[] = [];
  for (const account of accounts) {
    try {
      switch (account.platform) {
        case 'youtube':
          await syncYouTubeAccount(account.id);
          break;
        case 'instagram':
          await syncInstagramAccount(account.id);
          break;
        case 'facebook':
          await syncFacebookAccount(account.id);
          break;
        case 'tiktok':
          await syncTikTokAccount(account.id);
          break;
        default:
          issues.push(`${account.platform}: unsupported platform.`);
          continue;
      }
      synced++;
    } catch (error) {
      issues.push(`${account.platform}: ${error instanceof Error ? error.message : 'Refresh failed.'}`);
    }
  }

  return NextResponse.json(
    {
      ok: synced > 0,
      synced,
      attempted: accounts.length,
      issues,
      ...(synced === 0 ? { error: issues.join(' ') } : {}),
    },
    { status: synced ? 200 : 503 },
  );
}
