// PATCH /api/onboarding/creator/publish
// Toggles the creator profile's `published` flag. A profile can be
// published at any completeness — a half-filled profile is shown with
// a "profile in progress" badge so brands can still discover it. This
// is the lever to reduce onboarding drop-off: every step the creator
// finishes moves them forward, but they can ship as soon as they want.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { enforceRate } from '@/lib/rate-limit';

const schema = z.object({
  published: z.boolean(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (session.user.role !== 'creator') {
    return NextResponse.json({ error: 'Not a creator account' }, { status: 403 });
  }
  // 10 toggles per hour is plenty. The action is reversible and rarely needed
  // more than once a session.
  const rateCheck = enforceRate(
    req,
    { scope: 'creator.publish', limit: 10, windowMs: 60 * 60 * 1000 },
    session.user.id,
  );
  if (!rateCheck.ok) return rateCheck.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pass { published: boolean }.' }, { status: 400 });
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, published: true },
  });
  if (!profile) {
    return NextResponse.json(
      { error: 'Create your creator profile first.' },
      { status: 404 },
    );
  }

  const updated = await db.creatorProfile.update({
    where: { id: profile.id },
    data: {
      published: parsed.data.published,
      publishedAt: parsed.data.published ? new Date() : null,
    },
    select: { published: true, publishedAt: true },
  });
  return NextResponse.json({ ok: true, ...updated });
}
