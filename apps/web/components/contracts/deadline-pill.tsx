'use client';
import { AlertTriangle, Calendar, CheckCircle2, Clock } from 'lucide-react';
import {
  deadlineBucket,
  formatDeadline,
  type DeadlineBucket,
} from '@/lib/contracts';

const BUCKET_STYLES: Record<DeadlineBucket, string> = {
  overdue:
    'bg-[var(--color-anjuman-tint-red)] text-[var(--color-anjuman-red)] border-[var(--color-anjuman-tint-red)]',
  soon: 'bg-[var(--color-anjuman-tint-amber)] text-[var(--color-anjuman-amber)] border-[var(--color-anjuman-tint-amber)]',
  'this-week':
    'bg-[var(--color-anjuman-tint-yellow)] text-anjuman-ink border-[var(--color-anjuman-yellow)]/40',
  later: 'bg-[var(--color-anjuman-tint-purple)] text-[var(--color-anjuman-purple)] border-[var(--color-anjuman-tint-purple)]',
  none: 'bg-white text-anjuman-ink-soft border-[var(--color-anjuman-line)]',
};

const BUCKET_ICON = {
  overdue: AlertTriangle,
  soon: Clock,
  'this-week': Calendar,
  later: Calendar,
  none: CheckCircle2,
} as const;

export function DeadlinePill({
  due,
  small = false,
}: {
  due: Date | string | null | undefined;
  small?: boolean;
}) {
  const bucket = deadlineBucket(due);
  const Icon = BUCKET_ICON[bucket];
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 border rounded-full font-medium ' +
        BUCKET_STYLES[bucket] +
        (small ? ' text-[11px] px-2 py-0.5' : ' text-xs px-2.5 py-1')
      }
      data-testid="deadline-pill"
      data-bucket={bucket}
    >
      <Icon size={small ? 11 : 13} aria-hidden />
      {formatDeadline(due)}
    </span>
  );
}
