import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Read-only star rating. Pass `value` (1-5) and an optional `outOf` total
 * (defaults to 5). Half-star visual: rounds to nearest 0.5.
 */
export function StarRating({
  value,
  outOf = 5,
  size = 16,
  className,
}: {
  value: number;
  outOf?: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(value, outOf));
  return (
    <div
      role="img"
      aria-label={`Rated ${clamped} out of ${outOf}`}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {Array.from({ length: outOf }).map((_, i) => {
        const filled = i + 1 <= Math.floor(clamped);
        const half = !filled && i + 0.5 <= clamped;
        return (
          <Star
            key={i}
            size={size}
            strokeWidth={1.5}
            className={cn(
              filled || half
                ? 'fill-[var(--color-anjuman-amber)] text-[var(--color-anjuman-amber)]'
                : 'text-anjuman-line',
              half && 'fill-[url(#half-fill)]',
            )}
          />
        );
      })}
    </div>
  );
}
