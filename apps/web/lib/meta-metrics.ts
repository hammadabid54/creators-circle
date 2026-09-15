/**
 * Meta metrics sync — Instagram Graph + Facebook Pages.
 *
 * Covers both platforms because a single Meta OAuth flow can grant access to
 * both the user's IG business account and any FB Pages they admin. The OAuth
 * callback stores two SocialAccount rows; this file refreshes either one.
 *
 * API docs:
 *   https://developers.facebook.com/docs/instagram-api
 *   https://developers.facebook.com/docs/pages-api
 */

import { z } from 'zod';
import { db } from '@/lib/db';
import { recordMetrics } from '@/lib/creator-metrics';
import {
  classifyFetchError,
  fetchWithTimeout,
  getValidAccessToken,
  shouldThrottle,
  type SyncFailure,
} from '@/lib/sync-social';

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v22.0'}`;
const TOKEN_REFRESH_URL = `${GRAPH}/oauth/access_token`;

// ── Response schemas ────────────────────────────────────────────────────────

const igUserSchema = z.object({
  id: z.string(),
  username: z.string().optional(),
  followers_count: z.number().int().nonnegative().optional(),
  follows_count: z.number().int().nonnegative().optional(),
  media_count: z.number().int().nonnegative().optional(),
  biography: z.string().optional(),
});

const igMediaSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      caption: z.string().nullable().optional(),
      like_count: z.number().int().nonnegative().optional(),
      comments_count: z.number().int().nonnegative().optional(),
      media_type: z.string().optional(),
      timestamp: z.string().optional(),
      permalink: z.string().optional(),
    }),
  ),
});

const pageSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  username: z.string().optional(),
  followers_count: z.number().int().nonnegative().optional(),
  fan_count: z.number().int().nonnegative().optional(),
});

const pageInsightsSchema = z.object({
  data: z.array(
    z.object({
      name: z.string(),
      period: z.string(),
      values: z.array(z.object({ value: z.number().int().nonnegative() })),
    }),
  ),
});

const refreshResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
  token_type: z.string().optional(),
});

// ── Token refresh (Meta long-lived tokens) ─────────────────────────────────

async function refreshMetaToken(
  socialAccountId: string,
  currentRefreshToken: string,
): Promise<string> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    const err = new Error('Meta app credentials are not configured.') as SyncFailure;
    err.kind = 'expired';
    throw err;
  }
  // Meta's token refresh is a GET (yes, really) — no client_secret in the
  // request body, just on the URL. The response doesn't include a refresh
  // token; the existing refresh token stays valid until the user revokes it.
  const url = new URL(TOKEN_REFRESH_URL);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', currentRefreshToken);
  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) throw classifyFetchError(res.status, res.headers.get('retry-after'));
  const parsed = refreshResponseSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    const err = new Error('Meta returned a malformed token response.') as SyncFailure;
    err.kind = 'malformed';
    throw err;
  }
  await db.socialAccount.update({
    where: { id: socialAccountId },
    data: {
      accessToken: parsed.data.access_token,
      tokenExpiresAt: new Date(Date.now() + parsed.data.expires_in * 1000),
    },
  });
  return parsed.data.access_token;
}

// ── Engagement rate calculation ────────────────────────────────────────────

function engagementRateFromMedia(
  followers: number,
  posts: z.infer<typeof igMediaSchema>['data'],
): number | null {
  if (followers <= 0 || posts.length === 0) return null;
  const totalInteractions = posts.reduce((sum, p) => {
    return sum + (p.like_count ?? 0) + (p.comments_count ?? 0);
  }, 0);
  const perPost = totalInteractions / posts.length;
  // Industry-standard engagement = average interactions per post / followers.
  // Cap at 100% so a misconfigured media response can't blow up the profile.
  return Math.min(100, (perPost / followers) * 100);
}

// ── Instagram fetch ────────────────────────────────────────────────────────

async function fetchInstagramProfile(
  accessToken: string,
  externalId: string,
): Promise<{
  externalId: string;
  handle: string;
  followers: number;
  engagementRate: number | null;
  posts: Array<{ label: string; views: number; engagement: number | null }>;
}> {
  // Profile fields + last 10 media items in a single request where possible.
  // The Graph API supports `fields=...` on the user endpoint, and `media` is
  // a child edge we fetch separately.
  const userRes = await fetchWithTimeout(
    `${GRAPH}/${encodeURIComponent(externalId)}?fields=id,username,followers_count,follows_count,media_count,biography&access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!userRes.ok) throw classifyFetchError(userRes.status, userRes.headers.get('retry-after'));
  const user = igUserSchema.parse(await userRes.json());

  const mediaRes = await fetchWithTimeout(
    `${GRAPH}/${encodeURIComponent(externalId)}/media?fields=id,caption,like_count,comments_count,media_type,timestamp,permalink&limit=10&access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!mediaRes.ok) throw classifyFetchError(mediaRes.status, mediaRes.headers.get('retry-after'));
  const media = igMediaSchema.parse(await mediaRes.json());

  const followers = user.followers_count ?? 0;
  const engagementRate = engagementRateFromMedia(followers, media.data);
  const posts = media.data.slice(0, 10).map((p) => ({
    label: (p.caption ?? 'Untitled').slice(0, 150),
    views: 0, // IG Basic API doesn't expose view counts — left as 0 for now
    engagement:
      followers > 0
        ? Math.min(100, (((p.like_count ?? 0) + (p.comments_count ?? 0)) / followers) * 100)
        : null,
  }));

  return {
    externalId: user.id,
    handle: user.username ?? 'unknown',
    followers,
    engagementRate,
    posts,
  };
}

// ── Facebook page fetch ────────────────────────────────────────────────────

async function fetchFacebookPage(
  accessToken: string,
  externalId: string,
): Promise<{
  externalId: string;
  handle: string;
  followers: number;
  engagementRate: number | null;
  posts: Array<{ label: string; views: number; engagement: number | null }>;
}> {
  // The Pages API requires a page-specific access token. The user's token from
  // /me/accounts is normally sufficient for read endpoints, but engagement
  // math needs /{page-id}/insights for impressions. We try it, but if the
  // token doesn't have the right scope we fall back to zero engagement.
  const pageRes = await fetchWithTimeout(
    `${GRAPH}/me/accounts?fields=id,name,username,followers_count,fan_count&access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!pageRes.ok) throw classifyFetchError(pageRes.status, pageRes.headers.get('retry-after'));
  const pageData = z.object({ data: z.array(pageSchema) }).parse(await pageRes.json());
  const page = pageData.data.find((item) => item.id === externalId);
  if (!page) {
    const err = new Error('No Facebook Pages are linked to this Meta account.') as SyncFailure;
    err.kind = 'malformed';
    throw err;
  }
  const followers = page.followers_count ?? page.fan_count ?? 0;

  // Engagement = page-level daily impressions / followers, capped. This isn't
  // a perfect measure but it's what the public Pages API exposes without
  // needing a published_page scope review.
  let engagementRate: number | null = null;
  try {
    const insightsRes = await fetchWithTimeout(
      `${GRAPH}/${page.id}/insights?metric=page_impressions&period=day&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (insightsRes.ok) {
      const insights = pageInsightsSchema.parse(await insightsRes.json());
      const impressions = insights.data[0]?.values[0]?.value ?? 0;
      if (followers > 0 && impressions > 0) {
        engagementRate = Math.min(100, (impressions / followers) * 100);
      }
    }
  } catch {
    // Engagement metrics are best-effort — never block the rest of the sync
    // because the impressions endpoint is missing the right scope.
  }

  return {
    externalId: page.id,
    handle: page.username ?? page.name ?? 'unknown',
    followers,
    engagementRate,
    posts: [], // Posts aren't required for the profile page; left empty.
  };
}

// ── Public sync entry points ───────────────────────────────────────────────

export async function syncInstagramAccount(id: string): Promise<void> {
  const account = await db.socialAccount.findUnique({ where: { id } });
  if (
    !account ||
    account.platform !== 'instagram' ||
    account.connectionState === 'dev_mock' ||
    !account.accessToken
  ) {
    throw new Error('Connect a real Instagram account first.');
  }
  if (shouldThrottle(account.lastSyncedAt)) {
    throw new Error('Instagram statistics were refreshed recently. Try again in an hour.');
  }

  const accessToken = await getValidAccessToken(id, (rt) => refreshMetaToken(id, rt));
  if (!account.externalId) throw new Error('Reconnect Instagram to identify the account.');
  const profile = await fetchInstagramProfile(accessToken, account.externalId);

  const observedAt = new Date();
  await recordMetrics({
    socialAccountId: id,
    observedAt: observedAt.toISOString(),
    followers: profile.followers,
    source: 'provider',
    posts: profile.posts,
    cities: [],
    ages: [],
  });
  await db.socialAccount.update({
    where: { id },
    data: {
      externalId: profile.externalId,
      handle: profile.handle,
      followers: profile.followers,
      engagementRate: profile.engagementRate,
      connectionState: 'connected',
      lastSyncedAt: observedAt,
    },
  });
}

export async function syncFacebookAccount(id: string): Promise<void> {
  const account = await db.socialAccount.findUnique({ where: { id } });
  if (
    !account ||
    account.platform !== 'facebook' ||
    account.connectionState === 'dev_mock' ||
    !account.accessToken
  ) {
    throw new Error('Connect a real Facebook account first.');
  }
  if (shouldThrottle(account.lastSyncedAt)) {
    throw new Error('Facebook statistics were refreshed recently. Try again in an hour.');
  }

  const accessToken = await getValidAccessToken(id, (rt) => refreshMetaToken(id, rt));
  if (!account.externalId) throw new Error('Reconnect Facebook to identify the Page.');
  const page = await fetchFacebookPage(accessToken, account.externalId);

  const observedAt = new Date();
  await recordMetrics({
    socialAccountId: id,
    observedAt: observedAt.toISOString(),
    followers: page.followers,
    source: 'provider',
    posts: page.posts,
    cities: [],
    ages: [],
  });
  await db.socialAccount.update({
    where: { id },
    data: {
      externalId: page.externalId,
      handle: page.handle,
      followers: page.followers,
      engagementRate: page.engagementRate,
      connectionState: 'connected',
      lastSyncedAt: observedAt,
    },
  });
}
