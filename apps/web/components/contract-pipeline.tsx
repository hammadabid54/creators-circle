// Contract pipeline — the user's pending actions across all active
// contracts. Surfaces the items that need attention so the user doesn't
// have to dig through every contract to find what to do next.

import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  PenLine,
  Wallet,
} from 'lucide-react';
import { db } from '@/lib/db';
import { formatPKRCompact } from '@/lib/utils';
import { DeadlinePill } from './contracts/deadline-pill';

type ActionKind =
  | 'awaiting_signature'
  | 'awaiting_review'
  | 'revision_requested'
  | 'pending_payout'
  | 'milestone_due_soon';

type ActionItem = {
  kind: ActionKind;
  contractId: string;
  contractHref: string;
  /** Visible headline, e.g. "Approve 1 milestone" or "Awaiting Sara's signature". */
  headline: string;
  /** Secondary line, e.g. campaign title + counterparty. */
  subline: string;
  /** Optional deadline — when set, renders a small deadline pill. */
  dueDate: Date | null;
  /** Optional PKR figure (agreed rate or milestone amount). */
  amount?: number;
  /** True when this is a high-urgency item. */
  urgent?: boolean;
};

const KIND_META: Record<
  ActionKind,
  { label: string; icon: typeof CheckCircle2; tone: string }
> = {
  awaiting_signature: {
    label: 'Awaiting signature',
    icon: PenLine,
    tone: 'bg-anjuman-purple/10 text-anjuman-purple',
  },
  awaiting_review: {
    label: 'Awaiting your review',
    icon: Clock,
    tone: 'bg-amber-100 text-amber-800',
  },
  revision_requested: {
    label: 'Revision requested',
    icon: AlertCircle,
    tone: 'bg-rose-100 text-rose-800',
  },
  pending_payout: {
    label: 'Payout in progress',
    icon: Wallet,
    tone: 'bg-emerald-100 text-emerald-800',
  },
  milestone_due_soon: {
    label: 'Due soon',
    icon: Clock,
    tone: 'bg-amber-100 text-amber-800',
  },
};

export async function ContractPipeline({
  role,
  userId,
}: {
  role: 'brand' | 'creator';
  userId: string;
}) {
  // Pull the user's contracts with their milestones + the latest
  // submission per milestone. Sort by urgency.
  const contracts = await db.contract.findMany({
    where:
      role === 'brand'
        ? { brandId: userId, status: { in: ['active', 'pending_signature', 'pending_payout'] } }
        : { creatorId: userId, status: { in: ['active', 'pending_signature', 'pending_payout'] } },
    include: {
      campaign: { select: { title: true } },
      creator: { select: { name: true, creatorProfile: { select: { slug: true } } } },
      brand: { select: { name: true, brandProfile: { select: { company: true } } } },
      milestones: {
        orderBy: { dueDate: 'asc' },
        include: {
          submissions: {
            orderBy: { submittedAt: 'desc' },
            take: 1,
            include: { review: true },
          },
        },
      },
    },
  });

  const items: ActionItem[] = [];

  for (const c of contracts) {
    const counterparty =
      role === 'brand'
        ? c.creator.name || 'Creator'
        : c.brand.brandProfile?.company || c.brand.name || 'Brand';
    const counterpartySubline =
      role === 'brand'
        ? c.creator.creatorProfile?.slug
          ? `with ${counterparty}`
          : `with ${counterparty}`
        : `with ${counterparty}`;
    const baseHref =
      role === 'brand' ? `/brand/contracts/${c.id}` : `/creator/contracts/${c.id}`;

    // 1) Awaiting the OTHER side's signature — surfaces what the user is
    // blocked on so they can message the counterparty.
    if (c.status === 'pending_signature') {
      items.push({
        kind: 'awaiting_signature',
        contractId: c.id,
        contractHref: baseHref,
        headline:
          role === 'brand'
            ? `${c.creator.name?.split(' ')[0] || 'Creator'} hasn’t signed yet`
            : `Waiting for ${counterparty} to sign`,
        subline: c.campaign?.title || 'Direct collaboration',
        dueDate: null,
      });
    }

    // 2) Milestones that need the user's action.
    for (const m of c.milestones) {
      if (role === 'brand') {
        if (m.status === 'submitted') {
          items.push({
            kind: 'awaiting_review',
            contractId: c.id,
            contractHref: baseHref,
            headline: `Approve "${m.title}"`,
            subline: `${c.campaign?.title || 'Contract'} · ${counterpartySubline}`,
            dueDate: m.dueDate,
            amount: m.amount,
            urgent: true,
          });
        }
        if (m.status === 'revision_requested') {
          // The brand already requested a revision; no further action until
          // the creator re-submits. Skip.
        }
      } else {
        // Creator
        if (m.status === 'revision_requested') {
          items.push({
            kind: 'revision_requested',
            contractId: c.id,
            contractHref: baseHref,
            headline: `Revise "${m.title}"`,
            subline: `${c.campaign?.title || 'Contract'} · ${counterpartySubline}`,
            dueDate: m.dueDate,
            amount: m.amount,
            urgent: true,
          });
        }
        if (m.status === 'pending' && m.dueDate) {
          // Surface milestones due in the next 7 days as a soft reminder.
          const days = (m.dueDate.getTime() - Date.now()) / 86_400_000;
          if (days <= 7 && days >= -1) {
            items.push({
              kind: 'milestone_due_soon',
              contractId: c.id,
              contractHref: baseHref,
              headline: `"${m.title}" is due`,
              subline: `${c.campaign?.title || 'Contract'} · ${counterpartySubline}`,
              dueDate: m.dueDate,
              amount: m.amount,
            });
          }
        }
      }
    }

    // 3) Payout in progress — last-mile visibility.
    if (c.status === 'pending_payout') {
      items.push({
        kind: 'pending_payout',
        contractId: c.id,
        contractHref: baseHref,
        headline: 'Releasing payout',
        subline: `${c.campaign?.title || 'Contract'} · ${counterpartySubline}`,
        dueDate: null,
        amount: c.agreedRate,
      });
    }
  }

  // Sort: urgent first, then by kind priority, then by due date (null last).
  const kindOrder: ActionKind[] = [
    'awaiting_review',
    'revision_requested',
    'awaiting_signature',
    'milestone_due_soon',
    'pending_payout',
  ];
  items.sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    const ka = kindOrder.indexOf(a.kind);
    const kb = kindOrder.indexOf(b.kind);
    if (ka !== kb) return ka - kb;
    const ad = a.dueDate ? a.dueDate.getTime() : Number.POSITIVE_INFINITY;
    const bd = b.dueDate ? b.dueDate.getTime() : Number.POSITIVE_INFINITY;
    return ad - bd;
  });

  if (items.length === 0) return null;

  // Cap the list at 6 — if there are more, link to the contracts page.
  const shown = items.slice(0, 6);
  const more = Math.max(0, items.length - shown.length);

  return (
    <section
      className="cc-panel p-5 md:p-6 mb-8"
      data-testid="contract-pipeline"
      aria-label="What needs your attention"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-anjuman-purple" size={18} aria-hidden />
          <h2 className="text-base font-semibold">What needs you</h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-anjuman-purple/10 text-anjuman-purple font-semibold"
            data-testid="pipeline-count"
          >
            {items.length}
          </span>
        </div>
        <Link
          className="cc-link text-xs"
          href={role === 'brand' ? '/brand/contracts' : '/creator/contracts'}
        >
          View all
        </Link>
      </div>
      <ul className="divide-y divide-anjuman-line" role="list">
        {shown.map((it, i) => {
          const meta = KIND_META[it.kind];
          const Icon = meta.icon;
          return (
            <li key={`${it.contractId}-${it.kind}-${i}`}>
              <Link
                href={it.contractHref}
                className="flex items-start gap-3 py-3 px-1 -mx-1 rounded-md hover:bg-anjuman-bg transition group"
                data-testid={`pipeline-item-${it.kind}`}
              >
                <span
                  className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full ${meta.tone}`}
                  aria-hidden
                >
                  <Icon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{it.headline}</p>
                  <p className="cc-subtle text-xs mt-0.5 truncate">{it.subline}</p>
                  {(it.dueDate || it.amount) && (
                    <p className="text-xs mt-1.5 flex items-center gap-2 flex-wrap">
                      {it.dueDate && <DeadlinePill due={it.dueDate} />}
                      {it.amount && (
                        <span className="font-semibold text-anjuman-ink">
                          {formatPKRCompact(it.amount)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-anjuman-ink-soft group-hover:text-anjuman-purple shrink-0 mt-2"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {more > 0 && (
        <p className="text-xs cc-subtle mt-3">
          +{more} more in your{' '}
          <Link
            className="cc-link"
            href={role === 'brand' ? '/brand/contracts' : '/creator/contracts'}
          >
            contracts
          </Link>
        </p>
      )}
    </section>
  );
}
