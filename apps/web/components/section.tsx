import { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SectionProps {
  id?: string;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
}

export function Section({ id, className, containerClassName, children }: SectionProps) {
  return (
    <section id={id} className={cn('py-20 md:py-24', className)}>
      <div className={cn('max-w-7xl mx-auto px-5 md:px-8', containerClassName)}>{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  align = 'left',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 mb-10',
        align === 'center' && 'justify-center text-center flex-col',
        className,
      )}
    >
      <div>
        <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p
            className={cn(
              'text-anjuman-ink-soft mt-2 max-w-prose',
              align === 'center' && 'mx-auto',
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="text-anjuman-ink font-semibold hover:text-anjuman-purple transition flex items-center gap-1"
        >
          {ctaLabel} →
        </Link>
      )}
    </div>
  );
}
