// Session revocation. Bumping a user's sessionVersion is the global
// "log this user out everywhere" lever: every existing JWT becomes stale
// within the next page load, because the session callback compares the
// token's stamped copy against the live DB value and returns null on
// mismatch.
//
// Use cases: ban, KYC rejection, support-side password reset, role
// downgrade, account suspension.

import { db } from '@/lib/db';

export async function bumpSessionVersion(userId: string): Promise<number> {
  const updated = await db.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return updated.sessionVersion;
}
