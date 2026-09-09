import { allowSocialMocks } from '@/lib/social-providers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasRealCredentials, buildAuthorizeUrl } from '@/lib/social-providers';
import { issueState } from '@/lib/oauth-state';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  if (session.user.role !== 'creator')
    return NextResponse.json({ error: 'Not a creator account' }, { status: 403 });
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('returnTo') || '/creator/onboarding';

  if (!hasRealCredentials('youtube')) {
    if (!allowSocialMocks())
      return NextResponse.redirect(
        new URL('/creator/onboarding?error=provider_unavailable', req.url),
      );
    const state = await issueState('youtube', returnTo, true);
    const fake = new URL('/api/social/youtube/callback', req.url);
    fake.searchParams.set('code', 'dev_mock_' + state);
    fake.searchParams.set('state', state);
    return NextResponse.redirect(fake);
  }

  const state = await issueState('youtube', returnTo, false);
  return NextResponse.redirect(buildAuthorizeUrl('youtube', state));
}
