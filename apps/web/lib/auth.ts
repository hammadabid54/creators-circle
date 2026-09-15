import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authorizeIdentity } from '@/lib/login-identity';

const credentialsSchema = z.object({
  phone: z.string().max(30).optional(),
  email: z.string().max(254).optional(),
  code: z.string().regex(/^\d{6}$/),
});

// Only register Google when both env vars are set, so a missing config
// doesn't crash the app — it just hides the button.
const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/signin',
  },
  trustHost: true,
  providers: [
    ...(googleConfigured
      ? [Google({
          // NextAuth reads these from env automatically; explicit for clarity.
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          allowDangerousEmailAccountLinking: true,
        })]
      : []),
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
    // OAuth providers (Google) don't go through `authorize`. This callback
    // creates the User + Account rows when someone signs in via Google.
    async signIn({ user, account, profile }) {
      // Only handle OAuth providers here. Credentials provider already
      // creates the user in `authorize`.
      if (account?.provider === 'google') {
        const email = user.email ?? profile?.email;
        if (!email) return false;
        const existing = await db.user.findUnique({ where: { email } });
        const dbUser = existing
          ? existing
          : await db.user.create({
              data: {
                email,
                name: user.name ?? profile?.name ?? null,
                image: user.image ?? null,
                emailVerified: new Date(),
              },
            });
        // Link this Google account to the user (idempotent upsert).
        await db.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            refresh_token: account.refresh_token ?? undefined,
            access_token: account.access_token ?? undefined,
            expires_at:
              typeof account.expires_at === 'number'
                ? account.expires_at
                : undefined,
            token_type: account.token_type ?? undefined,
            scope: account.scope ?? undefined,
            id_token: account.id_token ?? undefined,
          },
          create: {
            userId: dbUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token ?? null,
            access_token: account.access_token ?? null,
            expires_at:
              typeof account.expires_at === 'number' ? account.expires_at : null,
            token_type: account.token_type ?? null,
            scope: account.scope ?? null,
            id_token: account.id_token ?? null,
          },
        });
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // Initial sign-in: copy from user object
      if (user) {
        // OAuth providers (Google) give us an id like "google|12345" — that's
        // not our DB user.id. The signIn callback above created a real User
        // row; we look it up by email and use *that* id.
        if (account?.provider === 'google' || !user.id || user.id.startsWith('google|')) {
          const email = user.email ?? profile?.email;
          if (email) {
            const dbUser = await db.user.findUnique({
              where: { email },
              select: { id: true, role: true, phone: true, name: true, sessionVersion: true },
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.role = dbUser.role ?? null;
              token.phone = dbUser.phone ?? null;
              token.name = dbUser.name ?? null;
              token.sessionVersion = dbUser.sessionVersion ?? 0;
            }
          }
        } else {
          // Credentials provider — user.id is already our DB id.
          token.id = user.id as string;
          token.role = (user as { role?: string | null }).role ?? null;
          token.phone = (user as { phone?: string | null }).phone ?? null;
          token.name = user.name ?? null;
        }
      }
      // Update from session.update({ ... }) — used by the role picker to
      // push the freshly-chosen role into the JWT in one round trip.
      if (token.id) {
        const current = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true, sessionVersion: true },
        });
        token.role = current?.role ?? null;
        token.name = current?.name ?? null;
        // Stamp the live sessionVersion so the session callback can detect
        // a bump (ban, KYC reject, support reset) and reject the session.
        token.sessionVersion = current?.sessionVersion ?? 0;
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
      // Reject the session if the token's sessionVersion is stale. This is
      // what makes sessionVersion a global, instant kill switch.
      // Note: this only fires when auth() is called. Pages and API routes
      // already call it; middleware uses auth.config.ts which is Edge-only
      // and never queries the DB. The deeper revocation check happens here.
      if (token.id && typeof token.sessionVersion === 'number') {
        const current = await db.user.findUnique({
          where: { id: token.id as string },
          select: { sessionVersion: true },
        });
        if (!current || current.sessionVersion !== token.sessionVersion) {
          return { ...session, user: undefined as unknown as typeof session.user };
        }
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
