import { cn } from '@/lib/utils';

interface TruckStripeProps {
  className?: string;
  variant?: 'pink' | 'mono';
}

/**
 * Motif B — Truck Art Stripe.
 * Inspired by the famous Pakistani truck decoration (phool patti),
 * distilled to a single horizontal band. Three layered diamond
 * shapes inside a thick bordered ribbon. Used as section dividers
 * and as the bottom border of the Final CTA.
 */
export function TruckStripe({ className, variant = 'pink' }: TruckStripeProps) {
  const fillMain = variant === 'mono' ? '#0A0A0F' : '#FF006E';
  const fillAccent = variant === 'mono' ? '#0A0A0F' : '#8338EC';
  const fillHi = variant === 'mono' ? '#0A0A0F' : '#00D9FF';

  return (
    <svg
      width="100%"
      height="40"
      viewBox="0 0 800 40"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('block', className)}
      aria-hidden="true"
    >
      {/* Top + bottom thick border */}
      <rect x="0" y="2" width="800" height="4" fill={fillMain} />
      <rect x="0" y="34" width="800" height="4" fill={fillMain} />
      {/* Inner thin border */}
      <rect x="0" y="9" width="800" height="1" fill={fillMain} opacity="0.4" />
      <rect x="0" y="30" width="800" height="1" fill={fillMain} opacity="0.4" />

      {/* Repeating diamonds */}
      {Array.from({ length: 17 }).map((_, i) => {
        const x = 24 + i * 47;
        return (
          <g key={i}>
            {/* Outer diamond */}
            <path d={`M ${x} 12 L ${x + 9} 20 L ${x} 28 L ${x - 9} 20 Z`} fill={fillMain} />
            {/* Inner accent diamond */}
            <path d={`M ${x} 16 L ${x + 5} 20 L ${x} 24 L ${x - 5} 20 Z`} fill={fillHi} />
            {/* Center dot */}
            <circle cx={x} cy="20" r="1.2" fill={fillMain} />
          </g>
        );
      })}

      {/* Three slightly larger accent diamonds at 1/4, 1/2, 3/4 */}
      {[200, 400, 600].map((x, i) => (
        <g key={`acc-${i}`}>
          <path d={`M ${x} 8 L ${x + 14} 20 L ${x} 32 L ${x - 14} 20 Z`} fill={fillAccent} />
          <path d={`M ${x} 13 L ${x + 9} 20 L ${x} 27 L ${x - 9} 20 Z`} fill={fillMain} />
          <path d={`M ${x} 17 L ${x + 5} 20 L ${x} 23 L ${x - 5} 20 Z`} fill={fillHi} />
        </g>
      ))}
    </svg>
  );
}
