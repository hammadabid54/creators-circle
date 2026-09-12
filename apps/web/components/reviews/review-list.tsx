import { StarRating } from './star-rating';

/**
 * Renders a list of reviews. Reviews are pre-fetched and passed in as
 * serialized plain objects so this can be a server component.
 */
export type ReviewListItem = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date | string;
  reviewer: {
    name: string | null;
    brandProfile: { company: string | null } | null;
    creatorProfile: { slug: string | null } | null;
  };
};

function reviewerLabel(r: ReviewListItem['reviewer']): string {
  if (r.brandProfile?.company) return r.brandProfile.company;
  return r.name || 'Reviewer';
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ReviewList({
  reviews,
  emptyMessage = 'No reviews yet.',
}: {
  reviews: ReviewListItem[];
  emptyMessage?: string;
}) {
  if (reviews.length === 0) {
    return <p className="cc-subtle text-sm">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <li key={r.id} className="border-b border-anjuman-line pb-4 last:border-0">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <StarRating value={r.rating} size={14} />
            <span className="text-xs text-anjuman-ink-soft">{formatDate(r.createdAt)}</span>
          </div>
          <p className="text-sm font-medium mb-1">Reviewed by {reviewerLabel(r.reviewer)}</p>
          {r.body ? (
            <p className="text-sm text-anjuman-ink-soft leading-relaxed whitespace-pre-line">
              {r.body}
            </p>
          ) : (
            <p className="text-sm text-anjuman-ink-soft italic">No written feedback.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
