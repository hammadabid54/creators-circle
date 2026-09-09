import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authorizeIdentity } from '@/lib/login-identity';

const credentialsSchema = z.object({
  phone: z.string().max(30).optional(),
  email: z.string().max(254).optional(),
  code: z.string().regex(/^\d{6}$/),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/signin',
  },
  trustHost: true,
  providers: [
    Credentials({
      name: 'Email or phone code',
      credentials: {
        phone: { label: 'Phone', type: 'tel' },
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await authorizeIdentity(parsed.data);
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          phone: user.phone,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in: copy from user object
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string | null }).role ?? null;
        token.phone = (user as { phone?: string | null }).phone ?? null;
        token.name = user.name ?? null;
      }
      // Update from session.update({ ... }) — used by the role picker to
      // push the freshly-chosen role into the JWT in one round trip.
      if (token.id) {
        const current = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true },
        });
        token.role = current?.role ?? null;
        token.name = current?.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? '';
        session.user.role = (token.role as string | null) ?? null;
        session.user.phone = (token.phone as string | null) ?? null;
        session.user.name = (token.name as string | null) ?? null;
      }
      return session;
    },
  },
});

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: string | null;
      phone?: string | null;
    } & DefaultSession['user'];
  }
  interface User {
    role?: string | null;
    phone?: string | null;
  }
}
