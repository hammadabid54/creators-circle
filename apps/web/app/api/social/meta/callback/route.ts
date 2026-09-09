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
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  if (!allowSocialMocks())
    return NextResponse.redirect(
      new URL('/creator/onboarding?error=provider_unavailable', req.url),
    );
  if (session.user.role !== 'creator')
    return NextResponse.json({ error: 'Not a creator account' }, { status: 403 });
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    code: url.searchParams.get('code') ?? undefined,
    state: url.searchParams.get('state'),
    error: url.searchParams.get('error') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL('/creator/onboarding?error=bad_request', req.url));
  }
  if (parsed.data.error) {
    return NextResponse.redirect(
      new URL(`/creator/onboarding?error=${encodeURIComponent(parsed.data.error)}`, req.url),
    );
  }

  const statePayload = await consumeState(parsed.data.state);
  if (!statePayload || statePayload.provider !== 'meta') {
    return NextResponse.redirect(new URL('/creator/onboarding?error=invalid_state', req.url));
  }

  const userId = session.user.id;
  const profile = await db.creatorProfile.findUnique({ where: { userId } });
  if (!profile) {
    return NextResponse.redirect(new URL('/creator/onboarding?error=no_profile', req.url));
  }

  const mock = statePayload.mock || !hasRealCredentials('meta');
  const code = parsed.data.code;

  // === Dev mock ===
  if ((mock && !allowSocialMocks()) || !code)
    return NextResponse.redirect(
      new URL('/creator/onboarding?error=provider_unavailable', req.url),
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
    return NextResponse.redirect(new URL('/creator/onboarding?connected=meta&mock=1', req.url));
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
    const token = (await tokenRes.json()) as MetaTokenResponse;

    // Fetch IG user info via Graph API
    // (In production: GET /me/accounts for pages, then GET /{ig-user-id}?fields=...)
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    await db.socialAccount.upsert({
      where: { creatorId_platform: { creatorId: profile.id, platform: 'instagram' } },
      update: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        connectionState: 'connected',
        lastSyncedAt: new Date(),
      },
      create: {
        creatorId: profile.id,
        platform: 'instagram',
        handle: 'pending_real_fetch',
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        connectionState: 'connected',
        lastSyncedAt: new Date(),
      },
    });
    return NextResponse.redirect(new URL('/creator/onboarding?connected=meta', req.url));
  } catch (err) {
    console.error('Meta OAuth error:', err);
    return NextResponse.redirect(new URL('/creator/onboarding?error=meta_token_exchange', req.url));
  }
}
