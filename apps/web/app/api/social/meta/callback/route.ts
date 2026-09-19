import { appUrl } from '@/lib/app-url';
import { allowSocialMocks } from '@/lib/social-providers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { consumeState } from '@/lib/oauth-state';
import { hasRealCredentials, PROVIDERS, redirectUri } from '@/lib/social-providers';
import { z } from 'zod';

const querySchema = z.object({
  code: z.string().optional(),
  state: z.string(),
  error: z.string().optional(),
});

interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

const pageSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  username: z.string().optional(),
  access_token: z.string().optional(),
  followers_count: z.number().int().nonnegative().optional(),
  fan_count: z.number().int().nonnegative().optional(),
  instagram_business_account: z
    .object({
      id: z.string(),
      username: z.string().optional(),
      followers_count: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

const accountsSchema = z.object({ data: z.array(pageSchema) });

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(appUrl('/signin'));
  }

  if (session.user.role !== 'creator')
    return NextResponse.json({ error: 'Not a creator account' }, { status: 403 });
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    code: url.searchParams.get('code') ?? undefined,
    state: url.searchParams.get('state'),
    error: url.searchParams.get('error') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.redirect(appUrl('/creator/onboarding?error=bad_request'));
  }
  if (parsed.data.error) {
    return NextResponse.redirect(
      appUrl(`/creator/onboarding?error=${encodeURIComponent(parsed.data.error)}`),
    );
  }

  const statePayload = await consumeState(parsed.data.state);
  if (!statePayload || statePayload.provider !== 'meta') {
    return NextResponse.redirect(appUrl('/creator/onboarding?error=invalid_state'));
  }

  const userId = session.user.id;
  const profile = await db.creatorProfile.findUnique({ where: { userId } });
  if (!profile) {
    return NextResponse.redirect(appUrl('/creator/onboarding?error=no_profile'));
  }

  const mock = statePayload.mock || !hasRealCredentials('meta');
  const code = parsed.data.code;

  // === Dev mock ===
  if ((mock && !allowSocialMocks()) || !code)
    return NextResponse.redirect(
      appUrl('/creator/onboarding?error=provider_unavailable'),
    );
  if (mock) {
    // Persist two mock accounts: Instagram + Facebook
    await db.socialAccount.upsert({
      where: { creatorId_platform: { creatorId: profile.id, platform: 'instagram' } },
      update: {
        connectionState: 'dev_mock',
        followers: 50_000,
        engagementRate: 4.2,
        lastSyncedAt: new Date(),
      },
      create: {
        creatorId: profile.id,
        platform: 'instagram',
        handle: 'demo_creator',
        externalId: 'mock_ig_1',
        followers: 50_000,
        engagementRate: 4.2,
        connectionState: 'dev_mock',
        lastSyncedAt: new Date(),
      },
    });
    await db.socialAccount.upsert({
      where: { creatorId_platform: { creatorId: profile.id, platform: 'facebook' } },
      update: {
        connectionState: 'dev_mock',
        followers: 30_000,
        engagementRate: 3.1,
        lastSyncedAt: new Date(),
      },
      create: {
        creatorId: profile.id,
        platform: 'facebook',
        handle: 'demo_creator',
        externalId: 'mock_fb_1',
        followers: 30_000,
        engagementRate: 3.1,
        connectionState: 'dev_mock',
        lastSyncedAt: new Date(),
      },
    });
    return NextResponse.redirect(appUrl('/creator/onboarding?connected=meta&mock=1'));
  }

  // === Real Meta token exchange ===
  try {
    const cfg = PROVIDERS.meta;
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env[cfg.clientIdEnv]!,
        client_secret: process.env[cfg.clientSecretEnv]!,
        redirect_uri: redirectUri('meta'),
        code,
      }),
    });
    if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
    const shortToken = (await tokenRes.json()) as MetaTokenResponse;
    if (!shortToken.access_token) throw new Error('Meta did not return an access token.');

    // Exchange the short-lived login token for a long-lived user token.
    const graphVersion = process.env.META_GRAPH_VERSION || 'v22.0';
    const longUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
    longUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longUrl.searchParams.set('client_id', process.env[cfg.clientIdEnv]!);
    longUrl.searchParams.set('client_secret', process.env[cfg.clientSecretEnv]!);
    longUrl.searchParams.set('fb_exchange_token', shortToken.access_token);
    const longRes = await fetch(longUrl);
    if (!longRes.ok) throw new Error(`long-lived token exchange failed: ${longRes.status}`);
    const token = (await longRes.json()) as MetaTokenResponse;
    if (!token.access_token) throw new Error('Meta did not return a long-lived token.');

    // Resolve the Facebook Page and the Instagram professional account linked to it.
    const accountsUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
    accountsUrl.searchParams.set(
      'fields',
      'id,name,username,followers_count,fan_count,instagram_business_account{id,username,followers_count}',
    );
    accountsUrl.searchParams.set('access_token', token.access_token);
    const accountsRes = await fetch(accountsUrl);
    if (!accountsRes.ok) throw new Error(`Meta account discovery failed: ${accountsRes.status}`);
    const accounts = accountsSchema.parse(await accountsRes.json());
    const page = accounts.data.find((item) => item.instagram_business_account);
    if (!page?.instagram_business_account)
      throw new Error('No Facebook Page with a linked Instagram professional account was found.');

    const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
    const sharedToken = {
      accessToken: token.access_token,
      refreshToken: token.access_token,
      tokenExpiresAt: expiresAt,
      connectionState: 'connected',
      lastSyncedAt: null,
    };
    const instagram = page.instagram_business_account;

    await db.socialAccount.upsert({
      where: { creatorId_platform: { creatorId: profile.id, platform: 'instagram' } },
      update: {
        ...sharedToken,
        externalId: instagram.id,
        handle: instagram.username ?? 'instagram_creator',
        followers: instagram.followers_count ?? 0,
      },
      create: {
        creatorId: profile.id,
        platform: 'instagram',
        externalId: instagram.id,
        handle: instagram.username ?? 'instagram_creator',
        followers: instagram.followers_count ?? 0,
        ...sharedToken,
      },
    });
    await db.socialAccount.upsert({
      where: { creatorId_platform: { creatorId: profile.id, platform: 'facebook' } },
      update: {
        ...sharedToken,
        externalId: page.id,
        handle: page.username ?? page.name ?? 'facebook_page',
        followers: page.followers_count ?? page.fan_count ?? 0,
      },
      create: {
        creatorId: profile.id,
        platform: 'facebook',
        externalId: page.id,
        handle: page.username ?? page.name ?? 'facebook_page',
        followers: page.followers_count ?? page.fan_count ?? 0,
        ...sharedToken,
      },
    });
    return NextResponse.redirect(appUrl('/creator/onboarding?connected=meta'));
  } catch (err) {
    console.error('Meta OAuth error:', err);
    return NextResponse.redirect(appUrl('/creator/onboarding?error=meta_token_exchange'));
  }
}
