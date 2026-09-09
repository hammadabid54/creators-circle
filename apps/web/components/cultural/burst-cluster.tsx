import { cn } from '@/lib/utils';

interface BurstClusterProps {
  className?: string;
  variant?: 'pink' | 'mono' | 'duo';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Motif A — Burst Cluster.
 * Extends the existing BurstMark brand mark into a repeating ornament.
 * Five marks: 1 large, 2 medium, 2 small — clustered like a constellation.
 * Used as section dividers, empty-state decoration, and a hero ornament.
 */
export function BurstCluster({ className, variant = 'pink', size = 'md' }: BurstClusterProps) {
  const dim = size === 'sm' ? 24 : size === 'lg' ? 80 : 48;

  const colors = {
    pink: { big: '#FF006E', med: '#8338EC', small: '#00D9FF' },
    duo: { big: '#0A0A0F', med: '#FF006E', small: '#0A0A0F' },
    mono: { big: '#0A0A0F', med: '#0A0A0F', small: '#0A0A0F' },
  }[variant];

  return (
    <svg
      width={dim * 2.6}
      height={dim}
      viewBox="0 0 130 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block', className)}
      aria-hidden="true"
    >
      {/* Big burst */}
      <path
        d="M 20 25 L 22 14 L 25 22 L 33 20 L 25 25 L 33 30 L 25 28 L 22 36 L 20 25 L 11 30 L 19 25 L 11 20 Z"
        fill={colors.big}
      />
      {/* Medium burst */}
      <path
        d="M 56 25 L 57.5 18 L 59.5 23.5 L 65 22 L 59.5 25 L 65 28 L 59.5 26.5 L 57.5 32 L 56 25 L 50 28 L 55 25 L 50 22 Z"
        fill={colors.med}
      />
      {/* Small burst */}
      <path
        d="M 84 25 L 85 20.5 L 86 24 L 90 23 L 86 25 L 90 27 L 86 26 L 85 29.5 L 84 25 L 80 27 L 83.5 25 L 80 23 Z"
        fill={colors.small}
      />
      {/* Medium right */}
      <path
        d="M 105 25 L 106 19 L 107.5 23.5 L 112 22.5 L 107.5 25 L 112 27.5 L 107.5 26.5 L 106 31 L 105 25 L 100.5 28 L 104 25 L 100.5 22 Z"
        fill={colors.med}
      />
      {/* Tiny right */}
      <path
        d="M 124 25 L 124.5 22.5 L 125 24.5 L 127 24 L 125 25 L 127 26 L 125 25.5 L 124.5 27.5 L 124 25 L 121.5 26.5 L 123.5 25 L 121.5 23.5 Z"
        fill={colors.small}
      />
    </svg>
  );
}
