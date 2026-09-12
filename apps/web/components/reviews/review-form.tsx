'use client';

import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { REVIEW_LIMITS } from '@/lib/reviews';
import { useToast } from '@/components/ui/toast';

/**
 * Inline review submission form. Posts to /api/reviews and refreshes the
 * page on success so the new review appears immediately.
 */
export function ReviewForm({
  contractId,
  revieweeLabel,
}: {
  contractId: string;
  revieweeLabel: string; // e.g. "Sara Hassan" — used in the prompt + success toast
}) {
  const router = useRouter();
  const { success, danger } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition();

  const canSubmit = rating > 0 && !isPending;

  function onSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractId,
            rating,
            body: body.trim() ? body.trim() : null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Could not save review');
        }
        success(`Thanks — your review of ${revieweeLabel} is now live.`);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not save review';
        danger(message);
      }
    });
  }

  return (
    <div className="cc-panel p-5 md:p-6">
      <p className="text-[11px] uppercase tracking-[.18em] text-anjuman-ink-soft mb-2">
        Leave a review
      </p>
      <h3 className="text-lg font-semibold mb-1">How was working with {revieweeLabel}?</h3>
      <p className="text-sm text-anjuman-ink-soft mb-4">
        Reviews are public on their profile. You can only leave one per contract.
      </p>

      <div className="flex items-center gap-1 mb-4" role="radiogroup" aria-label="Rating">
        {Array.from({ length: REVIEW_LIMITS.RATING_MAX }).map((_, i) => {
          const v = i + 1;
          const active = v <= (hover || rating);
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={rating === v}
              aria-label={`${v} star${v === 1 ? '' : 's'}`}
              disabled={isPending}
              onMouseEnter={() => setHover(v)}
              onMouseLeave={() => setHover(0)}
              onFocus={() => setHover(v)}
              onBlur={() => setHover(0)}
              onClick={() => setRating(v)}
              className={cn(
                'p-1 transition-colors',
                isPending ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              )}
            >
              <Star
                size={28}
                strokeWidth={1.5}
                className={cn(
                  active
                    ? 'fill-[var(--color-anjuman-amber)] text-[var(--color-anjuman-amber)]'
                    : 'text-anjuman-line',
                )}
              />
            </button>
          );
        })}
        <span className="ml-2 text-sm text-anjuman-ink-soft tabular-nums">
          {rating > 0 ? `${rating} / ${REVIEW_LIMITS.RATING_MAX}` : 'Tap a star'}
        </span>
      </div>

      <label className="block text-sm font-medium mb-1.5" htmlFor={'review-body-' + contractId}>
        Written feedback <span className="text-anjuman-ink-soft font-normal">(optional)</span>
      </label>
      <textarea
        id={'review-body-' + contractId}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={REVIEW_LIMITS.BODY_MAX}
        disabled={isPending}
        rows={3}
        placeholder="What worked well? Anything to flag for the next collaboration?"
        className="w-full rounded-md border border-anjuman-line bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-anjuman-purple)] disabled:opacity-50"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-anjuman-ink-soft tabular-nums">
          {body.length} / {REVIEW_LIMITS.BODY_MAX}
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="cc-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </div>
  );
}

/**
 * "Already reviewed" state — shown in place of the form when hasReviewed() is true.
 */
export function AlreadyReviewedNote({ revieweeLabel }: { revieweeLabel: string }) {
  return (
    <div className="cc-panel p-5 md:p-6">
      <p className="text-[11px] uppercase tracking-[.18em] text-anjuman-ink-soft mb-2">
        Review submitted
      </p>
      <h3 className="text-lg font-semibold mb-1">You&apos;ve already reviewed {revieweeLabel}.</h3>
      <p className="text-sm text-anjuman-ink-soft">
        Reviews are immutable to keep feedback honest. If something changed, message them directly.
      </p>
    </div>
  );
}
