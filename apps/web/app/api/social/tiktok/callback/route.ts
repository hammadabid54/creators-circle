import { appUrl } from '@/lib/app-url';
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
    return NextResponse.redirect(appUrl('/signin'));
  }

  if (!allowSocialMocks())
    return NextResponse.redirect(
      appUrl('/creator/onboarding?error=provider_unavailable'),
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
    return NextResponse.redirect(appUrl('/creator/onboarding?error=bad_request'));
  }
  if (parsed.data.error) {
    return NextResponse.redirect(
      appUrl(`/creator/onboarding?error=${encodeURIComponent(parsed.data.error)}`),
    );
  }

  const statePayload = await consumeState(parsed.data.state);
  if (!statePayload || statePayload.provider !== 'tiktok') {
    return NextResponse.redirect(appUrl('/creator/onboarding?error=invalid_state'));
  }

  const userId = session.user.id;
  const profile = await db.creatorProfile.findUnique({ where: { userId } });
  if (!profile) {
    return NextResponse.redirect(appUrl('/creator/onboarding?error=no_profile'));
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
  return NextResponse.redirect(appUrl('/creator/onboarding?connected=tiktok&mock=1'));
}
