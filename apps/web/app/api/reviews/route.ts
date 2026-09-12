import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  REVIEW_LIMITS,
  createReview,
  getAggregateRating,
  getReviewsForUser,
} from '@/lib/reviews';

const postSchema = z.object({
  contractId: z.string().min(1),
  rating: z.number().int().min(REVIEW_LIMITS.RATING_MIN).max(REVIEW_LIMITS.RATING_MAX),
  body: z.string().max(REVIEW_LIMITS.BODY_MAX).optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const review = await createReview({
      contractId: parsed.data.contractId,
      reviewerId: session.user.id,
      rating: parsed.data.rating,
      body: parsed.data.body ?? null,
    });
    return NextResponse.json({ ok: true, id: review.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save review';
    // Treat already-reviewed as a 409 (conflict) rather than 500
    if (message.toLowerCase().includes('already reviewed')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.toLowerCase().includes('not a party')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error('[reviews.POST]', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const getQuerySchema = z.object({
  user: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const url = new URL(req.url);
  const parsed = getQuerySchema.safeParse({
    user: url.searchParams.get('user') ?? '',
    limit: url.searchParams.get('limit') ?? 10,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const { user: userId, limit } = parsed.data;
  // Sanity-check that the requested user exists — avoids leaking review lists
  // for arbitrary / non-existent IDs through the auth gate.
  const exists = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [reviews, aggregate] = await Promise.all([
    getReviewsForUser(userId, limit),
    getAggregateRating(userId),
  ]);
  return NextResponse.json({ reviews, aggregate });
}
