/**
 * TikTok metrics sync.
 *
 * Uses the TikTok Display API (open.tiktokapis.com). The two scopes we request
 * during OAuth cover everything we need:
 *   - user.info.basic  — open_id, display_name, avatar_url, profile_deep_link
 *   - user.info.stats  — follower_count, following_count, likes_count, video_count
 *
 * For per-video engagement we hit /v2/video/list/ which returns likes,
 * comments, shares, and view counts for the user's last ~20 videos.
 *
 * Engagement = (likes + comments + shares) / views, averaged across videos.
 * Industry-standard for TikTok.
 */

import { z } from 'zod';
import { db } from '@/lib/db';
import { recordMetrics } from '@/lib/creator-metrics';
import {
  classifyFetchError,
  fetchWithTimeout,
  shouldThrottle,
  type SyncFailure,
} from '@/lib/sync-social';

const API = 'https://open.tiktokapis.com';

// ── Response schemas ────────────────────────────────────────────────────────

const userFieldsSchema = z.object({
  data: z.object({
    user: z.object({
      open_id: z.string(),
      display_name: z.string().optional(),
      avatar_url: z.string().optional(),
      profile_deep_link: z.string().optional(),
      follower_count: z.number().int().nonnegative().optional(),
      following_count: z.number().int().nonnegative().optional(),
      likes_count: z.number().int().nonnegative().optional(),
      video_count: z.number().int().nonnegative().optional(),
    }),
  }),
});

const videoListSchema = z.object({
  data: z.object({
    videos: z.array(
      z.object({
        id: z.string(),
        title: z.string().nullable().optional(),
        like_count: z.number().int().nonnegative().optional(),
        comment_count: z.number().int().nonnegative().optional(),
        share_count: z.number().int().nonnegative().optional(),
        view_count: z.number().int().nonnegative().optional(),
      }),
    ),
  }),
});

const refreshResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

// ── Token refresh ───────────────────────────────────────────────────────────

async function refreshTikTokToken(
  socialAccountId: string,
  currentRefreshToken: string,
): Promise<string> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    const err = new Error('TikTok app credentials are not configured.') as SyncFailure;
    err.kind = 'expired';
    throw err;
  }
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: currentRefreshToken,
  });
  const res = await fetchWithTimeout(`${API}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw classifyFetchError(res.status, res.headers.get('retry-after'));
  const parsed = refreshResponseSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    const err = new Error('TikTok returned a malformed token response.') as SyncFailure;
    err.kind = 'malformed';
    throw err;
  }
  await db.socialAccount.update({
    where: { id: socialAccountId },
    data: {
      accessToken: parsed.data.access_token,
      tokenExpiresAt: new Date(Date.now() + parsed.data.expires_in * 1000),
      ...(parsed.data.refresh_token ? { refreshToken: parsed.data.refresh_token } : {}),
    },
  });
  return parsed.data.access_token;
}

// ── Engagement rate ────────────────────────────────────────────────────────

function engagementFromVideos(
  videos: z.infer<typeof videoListSchema>['data']['videos'],
): number | null {
  if (videos.length === 0) return null;
  const totals = videos.reduce(
    (acc, v) => {
      acc.likes += v.like_count ?? 0;
      acc.comments += v.comment_count ?? 0;
      acc.shares += v.share_count ?? 0;
      acc.views += v.view_count ?? 0;
      return acc;
    },
    { likes: 0, comments: 0, shares: 0, views: 0 },
  );
  if (totals.views <= 0) return null;
  const rate = ((totals.likes + totals.comments + totals.shares) / totals.views) * 100;
  return Math.min(100, rate);
}

// ── API calls ──────────────────────────────────────────────────────────────

async function fetchTikTokUser(accessToken: string) {
  const url = new URL(`${API}/v2/user/info/`);
  url.searchParams.set(
    'fields',
    'open_id,display_name,avatar_url,profile_deep_link,follower_count,following_count,likes_count,video_count',
  );
  const res = await fetchWithTimeout(url.toString(), {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  if (!res.ok) throw classifyFetchError(res.status, res.headers.get('retry-after'));
  const parsed = userFieldsSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    const err = new Error('TikTok returned malformed user info.') as SyncFailure;
    err.kind = 'malformed';
    throw err;
  }
  return parsed.data.data.user;
}

async function fetchTikTokVideos(accessToken: string) {
  const body = JSON.stringify({
    max_count: 20,
    fields:
      'id,title,like_count,comment_count,share_count,view_count',
  });
  const res = await fetchWithTimeout(`${API}/v2/video/list/`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body,
  });
  // 404 / 403 are common when the user has no videos or scope was revoked —
  // not a fatal error for the rest of the sync.
  if (!res.ok) return [];
  const parsed = videoListSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) return [];
  return parsed.data.data.videos;
}

// ── Public sync entry point ────────────────────────────────────────────────

export async function syncTikTokAccount(id: string): Promise<void> {
  const account = await db.socialAccount.findUnique({ where: { id } });
  if (
    !account ||
    account.platform !== 'tiktok' ||
    account.connectionState === 'dev_mock' ||
    !account.accessToken
  ) {
    throw new Error('Connect a real TikTok account first.');
  }
  if (shouldThrottle(account.lastSyncedAt)) {
    throw new Error('TikTok statistics were refreshed recently. Try again in an hour.');
  }

  // Refresh if expiring within 60s.
  let accessToken = account.accessToken;
  if (
    !account.tokenExpiresAt ||
    account.tokenExpiresAt.getTime() - Date.now() < 60_000
  ) {
    if (!account.refreshToken) {
      throw new Error('Token expired and no refresh token available. Reconnect.');
    }
    accessToken = await refreshTikTokToken(id, account.refreshToken);
  }

  const user = await fetchTikTokUser(accessToken);
  const videos = await fetchTikTokVideos(accessToken);
  const followers = user.follower_count ?? 0;
  const engagementRate = engagementFromVideos(videos);

  const posts = videos.slice(0, 10).map((v) => ({
    label: (v.title ?? 'Untitled').slice(0, 150),
    views: v.view_count ?? 0,
    engagement:
      v.view_count && v.view_count > 0
        ? Math.min(
            100,
            (((v.like_count ?? 0) + (v.comment_count ?? 0) + (v.share_count ?? 0)) /
              v.view_count) *
              100,
          )
        : null,
  }));

  const observedAt = new Date();
  await recordMetrics({
    socialAccountId: id,
    observedAt: observedAt.toISOString(),
    followers,
    source: 'provider',
    posts,
    cities: [],
    ages: [],
  });
  await db.socialAccount.update({
    where: { id },
    data: {
      externalId: user.open_id,
      handle: user.display_name ?? 'unknown',
      followers,
      engagementRate,
      connectionState: 'connected',
      lastSyncedAt: observedAt,
    },
  });
}
