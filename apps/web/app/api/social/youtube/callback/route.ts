import { fetchYouTubeChannel } from '@/lib/youtube-metrics';
import { recordMetrics } from '@/lib/creator-metrics';
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

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/signin', req.url));
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
    return NextResponse.redirect(new URL('/creator/onboarding?error=bad_request', req.url));
  }
  if (parsed.data.error) {
    return NextResponse.redirect(
      new URL(`/creator/onboarding?error=${encodeURIComponent(parsed.data.error)}`, req.url),
    );
  }

  const statePayload = await consumeState(parsed.data.state);
  if (!statePayload || statePayload.provider !== 'youtube') {
    return NextResponse.redirect(new URL('/creator/onboarding?error=invalid_state', req.url));
  }

  const userId = session.user.id;
  const profile = await db.creatorProfile.findUnique({ where: { userId } });
  if (!profile) {
    return NextResponse.redirect(new URL('/creator/onboarding?error=no_profile', req.url));
  }

  const mock = statePayload.mock || !hasRealCredentials('youtube');
  const code = parsed.data.code;

  if ((mock && !allowSocialMocks()) || !code)
    return NextResponse.redirect(
      new URL('/creator/onboarding?error=provider_unavailable', req.url),
    );
  if (mock) {
    await db.socialAccount.upsert({
      where: { creatorId_platform: { creatorId: profile.id, platform: 'youtube' } },
      update: {
        connectionState: 'dev_mock',
        followers: 80_000,
        engagementRate: 5.0,
        lastSyncedAt: new Date(),
      },
      create: {
        creatorId: profile.id,
        platform: 'youtube',
        handle: 'demo_creator',
        externalId: 'mock_yt_1',
        followers: 80_000,
        engagementRate: 5.0,
        connectionState: 'dev_mock',
        lastSyncedAt: new Date(),
      },
    });
    return NextResponse.redirect(new URL('/creator/onboarding?connected=youtube&mock=1', req.url));
  }

  try {
    const cfg = PROVIDERS.youtube;
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env[cfg.clientIdEnv]!,
        client_secret: process.env[cfg.clientSecretEnv]!,
        redirect_uri: redirectUri('youtube'),
        grant_type: 'authorization_code',
        code,
      }),
    });
    if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
    const token = (await tokenRes.json()) as GoogleTokenResponse;
    const measured = await fetchYouTubeChannel(token.access_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    const connectedAccount = await db.socialAccount.upsert({
      where: { creatorId_platform: { creatorId: profile.id, platform: 'youtube' } },
      update: {
        ...measured,
        accessToken: token.access_token,
        ...(token.refresh_token ? { refreshToken: token.refresh_token } : {}),
        tokenExpiresAt: expiresAt,
        connectionState: 'connected',
        lastSyncedAt: new Date(),
      },
      create: {
        creatorId: profile.id,
        platform: 'youtube',
        ...measured,
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        connectionState: 'connected',
        lastSyncedAt: new Date(),
      },
    });
    await recordMetrics({
      socialAccountId: connectedAccount.id,
      observedAt: new Date().toISOString(),
      followers: measured.followers,
      source: 'provider',
      posts: [],
      cities: [],
      ages: [],
    });
    return NextResponse.redirect(new URL('/creator/onboarding?connected=youtube', req.url));
  } catch (err) {
    console.error('YouTube OAuth error:', err);
    return NextResponse.redirect(
      new URL('/creator/onboarding?error=youtube_token_exchange', req.url),
    );
  }
}
