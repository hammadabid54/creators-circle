import Link from 'next/link';
import { BurstMark } from './burst-mark';
import { Wordmark } from './wordmark';
import { cn } from '@/lib/utils';

interface LogoProps {
  href?: string | null;
  markSize?: number;
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ href = '/', markSize = 28, className, showWordmark = true }: LogoProps) {
  const inner = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BurstMark size={markSize} title={showWordmark ? undefined : 'Kollabo'} />
      {showWordmark && <Wordmark size="md" />}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Kollabo home"
        className="inline-flex hover:opacity-80 transition-opacity"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
