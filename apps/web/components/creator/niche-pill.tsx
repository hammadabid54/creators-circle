import { cn } from '@/lib/utils';

interface NichePillProps {
  niche: string;
  className?: string;
}

export function NichePill({ niche, className }: NichePillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-anjuman-line-soft text-anjuman-ink',
        className,
      )}
    >
      {niche}
    </span>
  );
}
