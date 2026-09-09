import { cn } from '@/lib/utils';

interface GatheringProps {
  className?: string;
  variant?: 'pink' | 'mono';
  size?: number;
}

/**
 * Motif C — Gathering.
 * Five abstract figures standing close in a circle, suggesting the
 * product name "Creators Circle" and its sense of community.
 * Used on empty states, on the 404 page, and as a load-state ornament.
 * Each figure is a head + shoulders silhouette in a brand color.
 */
export function Gathering({ className, variant = 'pink', size = 160 }: GatheringProps) {
  const palette =
    variant === 'mono'
      ? { c1: '#0A0A0F', c2: '#0A0A0F', c3: '#0A0A0F', c4: '#0A0A0F', c5: '#0A0A0F' }
      : { c1: '#FF006E', c2: '#8338EC', c3: '#00D9FF', c4: '#FFD60A', c5: '#25D366' };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block', className)}
      aria-hidden="true"
    >
      {/* Center figure (back) — yellow/green */}
      <g transform="translate(100 60)">
        <circle cx="0" cy="0" r="11" fill={palette.c4} />
        <path
          d="M -16 16 Q -16 12 -10 12 L 10 12 Q 16 12 16 16 L 16 50 L -16 50 Z"
          fill={palette.c4}
        />
      </g>

      {/* Left-mid figure — pink */}
      <g transform="translate(58 78)">
        <circle cx="0" cy="0" r="10" fill={palette.c1} />
        <path
          d="M -14 14 Q -14 11 -9 11 L 9 11 Q 14 11 14 14 L 14 45 L -14 45 Z"
          fill={palette.c1}
        />
      </g>

      {/* Right-mid figure — purple */}
      <g transform="translate(142 78)">
        <circle cx="0" cy="0" r="10" fill={palette.c2} />
        <path
          d="M -14 14 Q -14 11 -9 11 L 9 11 Q 14 11 14 14 L 14 45 L -14 45 Z"
          fill={palette.c2}
        />
      </g>

      {/* Front-left figure — cyan */}
      <g transform="translate(78 110)">
        <circle cx="0" cy="0" r="11" fill={palette.c3} />
        <path
          d="M -16 16 Q -16 12 -10 12 L 10 12 Q 16 12 16 16 L 16 52 L -16 52 Z"
          fill={palette.c3}
        />
      </g>

      {/* Front-right figure — green */}
      <g transform="translate(122 110)">
        <circle cx="0" cy="0" r="11" fill={palette.c5} />
        <path
          d="M -16 16 Q -16 12 -10 12 L 10 12 Q 16 12 16 16 L 16 52 L -16 52 Z"
          fill={palette.c5}
        />
      </g>

      {/* Ground line */}
      <line
        x1="40"
        y1="172"
        x2="160"
        y2="172"
        stroke={palette.c1}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
