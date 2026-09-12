// Contract & milestone helpers — status labels, deadline math, and a small
// shared client component for the "due in N days" pill.
//
// Kept dependency-free; the only thing that needs DOM is the pill, which
// lives in components/contracts/deadline-pill.tsx.

export type ContractStatus =
  | 'pending_signature'
  | 'active'
  | 'pending_payout'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  // Default label is creator-perspective (the one who still has to act).
  pending_signature: 'Awaiting your signature',
  active: 'In progress',
  pending_payout: 'Pending payout',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

// Status labels scoped to the viewer, so a brand and a creator see the same
// contract described from their own point of view. Pass `viewer: 'brand'`
// when the brand is looking; otherwise creator is the default.
export function getContractStatusLabel(
  status: ContractStatus,
  viewer: 'creator' | 'brand' = 'creator',
): string {
  if (status === 'pending_signature') {
    return viewer === 'brand' ? 'Awaiting their signature' : 'Awaiting your signature';
  }
  return CONTRACT_STATUS_LABEL[status];
}

/**
 * True when the contract is in a state where the two parties are still
 * actively working on it. Includes pending_payout so the contract stays
 * surfaced in the workspace until money actually moves; closing it
 * prematurely was the bug the reviewer flagged.
 */
export function isOpenContractStatus(value: string): value is ContractStatus {
  return value === 'active' || value === 'pending_signature' || value === 'pending_payout';
}

export type MilestoneStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'disputed'
  | 'revision_requested';

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  pending: 'Not started',
  submitted: 'Work submitted',
  approved: 'Approved',
  disputed: 'Disputed',
  revision_requested: 'Revisions requested',
};

export function isContractStatus(value: string): value is ContractStatus {
  return (Object.keys(CONTRACT_STATUS_LABEL) as ContractStatus[]).includes(value as ContractStatus);
}

export function isMilestoneStatus(value: string): value is MilestoneStatus {
  return (Object.keys(MILESTONE_STATUS_LABEL) as MilestoneStatus[]).includes(value as MilestoneStatus);
}

/** Days between today and a due date, rounded. Positive = future, negative = past. */
export function daysUntil(due: Date | string | null | undefined): number | null {
  if (!due) return null;
  const target = typeof due === 'string' ? new Date(due) : due;
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  // Normalize both to midnight UTC so a deadline of "tomorrow 00:00" still
  // reads as 1 day, not 0.
  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const ms = startOfDay(target) - startOfDay(now);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Bucket used by the deadline pill to pick a colour. */
export type DeadlineBucket = 'overdue' | 'soon' | 'this-week' | 'later' | 'none';

export function deadlineBucket(due: Date | string | null | undefined): DeadlineBucket {
  const d = daysUntil(due);
  if (d === null) return 'none';
  if (d < 0) return 'overdue';
  if (d <= 2) return 'soon';
  if (d <= 7) return 'this-week';
  return 'later';
}

/** "due in 3 days", "due today", "2 days overdue", "due Mar 14". */
export function formatDeadline(due: Date | string | null | undefined): string {
  if (!due) return 'No deadline';
  const d = daysUntil(due);
  const date = typeof due === 'string' ? new Date(due) : due;
  const pretty = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (d === null) return pretty;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  if (d === -1) return '1 day overdue';
  if (d < 0) return `${Math.abs(d)} days overdue`;
  if (d <= 7) return `Due in ${d} days`;
  return `Due ${pretty}`;
}

/** Compact PKR formatting for amounts stored as integer rupees. */
export function formatPKRAmount(amount: number): string {
  return 'PKR ' + (amount || 0).toLocaleString('en-PK');
}
