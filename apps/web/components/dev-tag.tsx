import { cn } from '@/lib/utils';

interface DevTagProps {
  className?: string;
  variant?: 'demo' | 'preview';
  size?: 'sm' | 'md';
  children?: React.ReactNode;
  title?: string;
}

/**
 * Single, intentional component for "demo data" / "preview" labels.
 * Replaces scattered yellow Post-it pills across the platform.
 * Always sits in the same place, same color, same size per page.
 */
export function DevTag({ className, variant = 'demo', size = 'sm', children, title }: DevTagProps) {
  const label = children ?? (variant === 'demo' ? 'Demo data' : 'Preview');
  return (
    <span
      title={title ?? 'Mock data — real sync requires Meta/YouTube/TikTok credentials'}
      className={cn(
        'inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded',
        'bg-anjuman-yellow/25 text-anjuman-ink border border-anjuman-yellow/40',
        size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
        className,
      )}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-anjuman-yellow"
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
