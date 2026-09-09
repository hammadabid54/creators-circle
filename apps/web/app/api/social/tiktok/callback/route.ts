import { allowSocialMocks } from '@/lib/social-providers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { consumeState } from '@/lib/oauth-state';
import { z } from 'zod';

const querySchema = z.object({
  code: z.string().optional(),
  state: z.string(),
  error: z.string().optional(),
});

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
  if (!statePayload || statePayload.provider !== 'tiktok') {
    return NextResponse.redirect(new URL('/creator/onboarding?error=invalid_state', req.url));
  }

  const userId = session.user.id;
  const profile = await db.creatorProfile.findUnique({ where: { userId } });
  if (!profile) {
    return NextResponse.redirect(new URL('/creator/onboarding?error=no_profile', req.url));
  }

  // Always mock for now — TikTok business partnership pending
  await db.socialAccount.upsert({
    where: { creatorId_platform: { creatorId: profile.id, platform: 'tiktok' } },
    update: {
      connectionState: 'dev_mock',
      followers: 25_000,
      engagementRate: 6.0,
      lastSyncedAt: new Date(),
    },
    create: {
      creatorId: profile.id,
      platform: 'tiktok',
      handle: 'demo_creator',
      externalId: 'mock_tt_1',
      followers: 25_000,
      engagementRate: 6.0,
      connectionState: 'dev_mock',
      lastSyncedAt: new Date(),
    },
  });
  return NextResponse.redirect(new URL('/creator/onboarding?connected=tiktok&mock=1', req.url));
}
