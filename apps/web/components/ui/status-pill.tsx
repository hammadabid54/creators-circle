import {
  type ContractStatus,
  type MilestoneStatus,
} from '@/lib/contracts';
import { cn } from '@/lib/utils';

export type PillTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'brand';

/** Map a ContractStatus to a pill tone + label. Viewer-aware labels come
 *  from getContractStatusLabel; tone is derived from the status semantics. */
export function contractTone(status: ContractStatus): PillTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending_payout':
      return 'warning';
    case 'active':
      return 'brand';
    case 'pending_signature':
      return 'info';
    case 'cancelled':
    case 'disputed':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function milestoneTone(status: MilestoneStatus): PillTone {
  switch (status) {
    case 'approved':
      return 'success';
    case 'submitted':
      return 'info';
    case 'revision_requested':
      return 'warning';
    case 'pending':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function StatusPill({
  tone,
  children,
  className,
  title,
}: {
  tone: PillTone;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn('cc-status-pill', `cc-status-pill-${tone}`, className)}
      title={title}
      data-testid="status-pill"
      data-tone={tone}
    >
      {children}
    </span>
  );
}

/** A small leading dot for richer visual signal (optional). */
export function StatusDot({ tone }: { tone: PillTone }) {
  const colorClass: Record<PillTone, string> = {
    success: 'bg-[var(--color-anjuman-green)]',
    warning: 'bg-[var(--color-anjuman-amber)]',
    danger: 'bg-[var(--color-anjuman-red)]',
    info: 'bg-[var(--color-anjuman-cyan)]',
    neutral: 'bg-[var(--color-anjuman-ink-soft)]',
    brand: 'bg-[var(--color-anjuman-purple)]',
  };
  return (
    <span
      aria-hidden
      className={cn('h-1.5 w-1.5 rounded-full inline-block', colorClass[tone])}
    />
  );
}
