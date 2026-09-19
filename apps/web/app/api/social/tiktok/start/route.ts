import { appUrl } from '@/lib/app-url';
import { allowSocialMocks } from '@/lib/social-providers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasRealCredentials, buildAuthorizeUrl } from '@/lib/social-providers';
import { issueState } from '@/lib/oauth-state';

/**
 * TikTok requires business partnership approval (4-8 weeks) before real
 * keys can be issued. Until then, this route is dev-mocked end-to-end.
 */
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
  const returnTo = url.searchParams.get('returnTo') || '/creator/onboarding';

  if (!hasRealCredentials('tiktok')) {
    if (!allowSocialMocks())
      return NextResponse.redirect(
        appUrl('/creator/onboarding?error=provider_unavailable'),
      );
    const state = await issueState('tiktok', returnTo, true);
    const fake = appUrl('/api/social/tiktok/callback');
    fake.searchParams.set('code', 'dev_mock_' + state);
    fake.searchParams.set('state', state);
    return NextResponse.redirect(fake);
  }

  const state = await issueState('tiktok', returnTo, false);
  return NextResponse.redirect(buildAuthorizeUrl('tiktok', state));
}
