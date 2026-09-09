import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
const { auth } = NextAuth(authConfig);
import { NextResponse } from 'next/server';

const protectedPrefixes = ['/creator', '/brand', '/admin', '/onboarding', '/account', '/messages'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (isProtected && !req.auth) {
    const url = new URL('/signin', req.url);
    url.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Authed users hitting /signin or /signup go to their dashboard or onboarding.
  if (req.auth && (pathname === '/signin' || pathname === '/signup')) {
    const role = req.auth.user?.role;
    if (role === 'creator') return NextResponse.redirect(new URL('/creator/dashboard', req.url));
    if (role === 'brand') return NextResponse.redirect(new URL('/brand/dashboard', req.url));
    return NextResponse.redirect(new URL('/onboarding/role', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
