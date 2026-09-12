import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { DeadlinePill } from './deadline-pill';
import {
  getContractStatusLabel,
  isContractStatus,
  isMilestoneStatus,
  formatPKRAmount,
} from '@/lib/contracts';

type Milestone = {
  id: string;
  title: string;
  amount: number;
  dueDate: Date | null;
  status: string;
};

export type ContractCardData = {
  id: string;
  status: string;
  agreedRate: number;
  createdAt: Date;
  milestones: Milestone[];
  campaign: { title: string } | null;
  counterparty: {
    label: string;
    href: string;
  };
  detailHref: string;
};

function nextDue(ms: Array<{ dueDate: Date | null }>) {
  const future = ms
    .map((m) => m.dueDate)
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return future ?? null;
}

export function ContractCard({
  c,
  viewer = 'creator',
}: {
  c: ContractCardData;
  viewer?: 'creator' | 'brand';
}) {
  const status = isContractStatus(c.status) ? c.status : 'active';
  const due = nextDue(c.milestones);
  const approved = c.milestones.filter(
    (m) => isMilestoneStatus(m.status) && m.status === 'approved',
  ).length;
  const allDone = c.milestones.length > 0 && approved === c.milestones.length;
  const title = c.campaign?.title || 'Direct collaboration';

  let footnote = 'Active collaboration.';
  if (status === 'pending_signature') {
    // The label tells you who acts next; the footnote is the human line.
    footnote =
      viewer === 'brand'
        ? `Waiting for ${c.counterparty.label} to sign.`
        : 'You haven\u2019t signed yet. Open the contract to start.';
  } else if (allDone) {
    footnote = 'All milestones approved. Awaiting brand to mark complete.';
  }

  return (
    <li className="cc-panel p-5 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-xs text-anjuman-purple uppercase tracking-wider font-semibold">
            {getContractStatusLabel(status, viewer)}
          </p>
          <Link
            href={c.detailHref}
            className="block text-lg font-semibold mt-1 hover:text-anjuman-purple"
          >
            {title}
          </Link>
          <p className="cc-subtle text-sm mt-1">
            With{' '}
            <Link href={c.counterparty.href} className="cc-link">
              {c.counterparty.label}
            </Link>
          </p>
        </div>
        <DeadlinePill due={due} />
      </div>
      <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="cc-subtle text-xs uppercase tracking-wider">Amount</p>
          <p className="font-semibold mt-0.5">{formatPKRAmount(c.agreedRate)}</p>
        </div>
        <div>
          <p className="cc-subtle text-xs uppercase tracking-wider">Milestones</p>
          <p className="font-semibold mt-0.5">
            {approved} / {c.milestones.length} approved
          </p>
        </div>
        <div>
          <p className="cc-subtle text-xs uppercase tracking-wider">Started</p>
          <p className="font-semibold mt-0.5">
            {c.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <p className="cc-subtle text-xs">{footnote}</p>
        <Link
          href={c.detailHref}
          className="cc-link text-sm inline-flex items-center gap-1"
        >
          Open <ArrowUpRight size={14} />
        </Link>
      </div>
    </li>
  );
}
