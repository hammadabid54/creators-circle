import { StarRating } from './star-rating';

/**
 * Aggregate rating display: big number + stars + "from N reviews".
 * Used on creator profile pages and contract headers.
 */
export function RatingSummary({
  avg,
  count,
  size = 'md',
}: {
  avg: number | null;
  count: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (count === 0 || avg == null) {
    return (
      <p className="cc-subtle text-sm">
        No reviews yet. Reviews appear after the first approved milestone.
      </p>
    );
  }

  const bigClass =
    size === 'lg' ? 'text-4xl md:text-5xl' : size === 'sm' ? 'text-lg' : 'text-2xl md:text-3xl';
  const starSize = size === 'lg' ? 22 : size === 'sm' ? 14 : 18;

  return (
    <div className="flex items-center gap-3">
      <span className={`${bigClass} font-semibold text-anjuman-purple tabular-nums`}>
        {avg.toFixed(1)}
      </span>
      <div className="flex flex-col">
        <StarRating value={avg} size={starSize} />
        <span className="text-xs text-anjuman-ink-soft mt-0.5">
          from {count} review{count === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
