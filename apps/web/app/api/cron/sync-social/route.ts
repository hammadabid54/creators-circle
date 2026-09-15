import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { syncYouTubeAccount } from '@/lib/youtube-metrics';
import { syncInstagramAccount, syncFacebookAccount } from '@/lib/meta-metrics';
import { syncTikTokAccount } from '@/lib/tiktok-metrics';
import { shouldThrottle } from '@/lib/sync-social';

/**
 * Scheduled social sync — designed to be hit by an external scheduler
 * (Vercel Cron, GitHub Actions, cron-job.org, etc.) on a cadence.
 *
 * Auth: a shared `CRON_SECRET` env var. The scheduler must send it as
 * `Authorization: Bearer <CRON_SECRET>`. This protects the endpoint from
 * being triggered by random unauthenticated requests.
 *
 * Behaviour:
 *   - Fetches every connected (non-dev-mock) account.
 *   - Skips accounts that were synced within the last hour (rate-limit
 *     protection across the platform).
 *   - Syncs each one, collecting per-account errors instead of bailing.
 *   - Caps total work per run at MAX_PER_RUN to keep request time bounded.
 */

const MAX_PER_RUN = 50;
const MAX_RUNTIME_MS = 50_000; // Vercel hobby tier has a 60s function limit; leave headroom

const headerSchema = z.object({
  authorization: z.string().optional(),
});

export async function GET(req: Request) {
  // 1. Auth: must be cron or have a valid shared secret.
  const headers = headerSchema.safeParse(
    Object.fromEntries(req.headers.entries()),
  );
  if (!headers.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const authz = headers.data.authorization ?? '';
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server.' },
      { status: 503 },
    );
  }
  const provided = authz.replace(/^Bearer\s+/i, '');
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Pick up accounts that are due for a refresh.
  const accounts = await db.socialAccount.findMany({
    where: { connectionState: 'connected' },
    take: MAX_PER_RUN * 2, // we'll filter and trim below
  });

  const now = Date.now();
  const due = accounts
    .filter((a) => !shouldThrottle(a.lastSyncedAt, now))
    .slice(0, MAX_PER_RUN);

  // 3. Run them. Don't bail on a single failure — collect and continue.
  let synced = 0;
  let expired = 0;
  const startedAt = Date.now();
  const issues: string[] = [];

  for (const account of due) {
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      issues.push('runtime_limit_reached');
      break;
    }
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
          issues.push(`${account.id}: unsupported platform ${account.platform}`);
          continue;
      }
      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      // Token-expired errors are normal maintenance — don't alarm.
      if (/expired|reconnect/i.test(msg)) expired++;
      else issues.push(`${account.platform}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: true,
    considered: accounts.length,
    due: due.length,
    synced,
    expired,
    issues,
    durationMs: Date.now() - startedAt,
  });
}
