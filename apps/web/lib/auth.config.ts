import type { NextAuthConfig } from 'next-auth';
// Middleware must not import Prisma, OTP hashing, or Node-only providers.
export const authConfig = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/signin' },
  trustHost: true,
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || '';
        session.user.role = (token.role as string) || null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
