import { cn } from '@/lib/utils';

interface WordmarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDot?: boolean;
}

const sizeClasses = {
  sm: 'text-sm sm:text-base',
  md: 'text-lg sm:text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

export function Wordmark({ className, size = 'md', showDot = false }: WordmarkProps) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap font-display font-bold tracking-tight',
        'text-anjuman-ink',
        sizeClasses[size],
        className,
      )}
    >
      Creators Circle{showDot ? '.' : ''}
    </span>
  );
}
