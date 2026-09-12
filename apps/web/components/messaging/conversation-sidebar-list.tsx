'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { StatusPill, contractTone } from '@/components/ui/status-pill';
import {
  type ContractStatus,
  getContractStatusLabel,
} from '@/lib/contracts';

export type SidebarItem = {
  primaryThreadId: string;
  primaryThreadKind: 'contract' | 'application';
  name: string;
  partnerImage?: string;
  campaignTitle: string;
  lastActivityAtIso: string;
  lastMessagePreview: string;
  activeContract?: {
    id: string;
    title: string;
    status: ContractStatus;
    step: number;
    approvedMilestones: number;
    totalMilestones: number;
  };
  otherThreadCount: number;
};

const STEP_LABELS = ['Signed', 'Active', 'In review', 'Payout', 'Done'];

export function ConversationSidebarList({
  items,
  viewerRole,
}: {
  items: SidebarItem[];
  viewerRole: 'brand' | 'creator';
}) {
  const pathname = usePathname();
  const activeId = pathname?.startsWith('/messages/')
    ? pathname.slice('/messages/'.length)
    : undefined;

  return (
    <ul className="overflow-y-auto flex-1 divide-y divide-anjuman-line" data-testid="conversation-sidebar-list">
      {items.map((it) => {
        const isActive = it.primaryThreadId === activeId;
        return (
          <li key={it.primaryThreadId}>
            <Link
              href={'/messages/' + it.primaryThreadId}
              className={
                'block px-5 py-4 hover:bg-anjuman-bg transition-colors ' +
                (isActive
                  ? 'bg-[#faf5f9] border-l-2 border-anjuman-purple'
                  : 'border-l-2 border-transparent')
              }
              data-testid="sidebar-item"
              data-thread-id={it.primaryThreadId}
              data-active={isActive ? 'true' : 'false'}
            >
              <div className="flex gap-3">
                <Avatar name={it.name} src={it.partnerImage} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 items-baseline">
                    <p className="font-semibold text-sm truncate">{it.name}</p>
                    <time
                      className="text-[10px] text-anjuman-ink-soft whitespace-nowrap"
                      dateTime={it.lastActivityAtIso}
                    >
                      {new Date(it.lastActivityAtIso).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </time>
                  </div>
                  <p className="text-xs text-anjuman-purple truncate mt-0.5">
                    {it.campaignTitle}
                  </p>
                  <p className="text-xs text-anjuman-ink-soft truncate mt-1.5">
                    {it.lastMessagePreview}
                  </p>

                  {it.activeContract && (
                    <div className="mt-2.5" data-testid="sidebar-mini-stepper">
                      <div className="flex items-center gap-1">
                        {STEP_LABELS.map((_label, i) => {
                          const stepNum = i + 1;
                          const isCurrent = stepNum === it.activeContract!.step;
                          const isPast = stepNum < it.activeContract!.step;
                          const isStopped =
                            it.activeContract!.status === 'cancelled' ||
                            it.activeContract!.status === 'disputed';
                          return (
                            <div
                              key={_label}
                              className="flex-1 flex items-center gap-1"
                              title={_label}
                            >
                              <span
                                className={
                                  'h-1.5 flex-1 rounded-full ' +
                                  (isStopped
                                    ? 'bg-red-300'
                                    : isPast
                                      ? 'bg-anjuman-purple'
                                      : isCurrent
                                        ? 'bg-anjuman-purple animate-pulse'
                                        : 'bg-anjuman-line')
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-anjuman-ink-soft mt-1 flex items-center gap-2 flex-wrap">
                        <StatusPill tone={contractTone(it.activeContract.status)}>
                          {getContractStatusLabel(it.activeContract.status, viewerRole)}
                        </StatusPill>
                        <span>
                          {it.activeContract.approvedMilestones}/{it.activeContract.totalMilestones}{' '}
                          milestones
                        </span>
                        {it.activeContract.status === 'completed' && (
                          <Check size={10} className="text-emerald-700" />
                        )}
                      </p>
                    </div>
                  )}

                  {!it.activeContract && it.primaryThreadKind === 'application' && (
                    <p className="text-[10px] mt-2 inline-block font-bold uppercase tracking-wider text-anjuman-ink-soft bg-[#f0e8d4] px-2 py-0.5 rounded-full">
                      Pre-agreement
                    </p>
                  )}

                  {it.otherThreadCount > 0 && (
                    <p className="text-[10px] text-anjuman-ink-soft mt-1.5">
                      + {it.otherThreadCount} older{' '}
                      {it.otherThreadCount === 1 ? 'thread' : 'threads'} with{' '}
                      {it.name.split(' ')[0]}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
