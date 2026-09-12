/**
 * Server helpers for the user-to-user review system.
 *
 * Scope: a Review is written after a contract has produced value (at least one
 * milestone approved). Both parties can submit one review each per contract;
 * reviews are immutable once written.
 */

import { db } from '@/lib/db';

export type ReviewEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

const RATING_MIN = 1;
const RATING_MAX = 5;
const BODY_MAX = 1000;

export type ReviewWithRelations = Awaited<ReturnType<typeof getReviewsForUser>>[number];

/**
 * Can the given user submit a review on this contract right now?
 * Requires:
 *  - User is a party to the contract
 *  - Contract has at least one approved milestone (creator has delivered value)
 *  - User hasn't already reviewed this contract
 */
export async function getReviewEligibility(
  contractId: string,
  userId: string,
): Promise<ReviewEligibility> {
  const contract = await db.contract.findUnique({
    where: { id: contractId },
    select: {
      brandId: true,
      creatorId: true,
      milestones: {
        where: { status: 'approved' },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!contract) return { eligible: false, reason: 'Contract not found' };

  const isParty = contract.brandId === userId || contract.creatorId === userId;
  if (!isParty) return { eligible: false, reason: 'You are not a party to this contract' };

  if (contract.milestones.length === 0) {
    return {
      eligible: false,
      reason: 'No approved milestones yet — wait until the first milestone is approved',
    };
  }

  const existing = await db.review.findUnique({
    where: { contractId_reviewerId: { contractId, reviewerId: userId } },
    select: { id: true },
  });
  if (existing) return { eligible: false, reason: 'You have already reviewed this contract' };

  return { eligible: true };
}

/**
 * Submit a review. Validates inputs and eligibility, then writes atomically.
 * Throws an Error with a user-facing message on validation failure.
 */
export async function createReview(args: {
  contractId: string;
  reviewerId: string;
  rating: number;
  body?: string | null;
}) {
  const { contractId, reviewerId, rating, body } = args;

  if (
    !Number.isInteger(rating) ||
    rating < RATING_MIN ||
    rating > RATING_MAX
  ) {
    throw new Error('Rating must be an integer between 1 and 5');
  }
  if (body != null && body.length > BODY_MAX) {
    throw new Error(`Review body must be ${BODY_MAX} characters or fewer`);
  }

  const contract = await db.contract.findUnique({
    where: { id: contractId },
    select: { brandId: true, creatorId: true },
  });
  if (!contract) throw new Error('Contract not found');

  const isBrand = contract.brandId === reviewerId;
  const isCreator = contract.creatorId === reviewerId;
  if (!isBrand && !isCreator) {
    throw new Error('You are not a party to this contract');
  }
  const revieweeId = isBrand ? contract.creatorId : contract.brandId;

  const eligibility = await getReviewEligibility(contractId, reviewerId);
  if (!eligibility.eligible) throw new Error(eligibility.reason);

  return db.review.create({
    data: {
      contractId,
      reviewerId,
      revieweeId,
      rating,
      body: body?.trim() ? body.trim() : null,
    },
  });
}

/**
 * Has this user already reviewed this contract?
 * Cheap pre-check for UI state ("Leave a review" vs "You've already reviewed").
 */
export async function hasReviewed(contractId: string, reviewerId: string): Promise<boolean> {
  const r = await db.review.findUnique({
    where: { contractId_reviewerId: { contractId, reviewerId } },
    select: { id: true },
  });
  return !!r;
}

/**
 * Aggregate rating for a user (creator or brand). Returns
 *   { avg, count } or { avg: null, count: 0 } if no reviews yet.
 * Avg is rounded to 1 decimal for display.
 */
export async function getAggregateRating(userId: string): Promise<{
  avg: number | null;
  count: number;
}> {
  const [agg, count] = await Promise.all([
    db.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
    }),
    db.review.count({ where: { revieweeId: userId } }),
  ]);
  if (count === 0) return { avg: null, count: 0 };
  return { avg: Math.round((agg._avg.rating ?? 0) * 10) / 10, count };
}

/**
 * Recent reviews written about a user, newest first. Returns reviews with
 * reviewer display name (and company for brands) so the UI can render
 * "Reviewed by Khaadi Pakistan" out of the box.
 */
export async function getReviewsForUser(userId: string, limit = 10) {
  return db.review.findMany({
    where: { revieweeId: userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 50),
    include: {
      reviewer: {
        select: {
          name: true,
          brandProfile: { select: { company: true } },
          creatorProfile: { select: { slug: true } },
        },
      },
    },
  });
}

/**
 * Reviews written by this user (so a creator can see "I've left 4 reviews"
 * in their own dashboard later). Optional — only call where needed.
 */
export async function getReviewsByUser(userId: string, limit = 10) {
  return db.review.findMany({
    where: { reviewerId: userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 50),
    include: {
      contract: { select: { id: true, campaign: { select: { title: true } } } },
    },
  });
}

export const REVIEW_LIMITS = {
  RATING_MIN,
  RATING_MAX,
  BODY_MAX,
} as const;
