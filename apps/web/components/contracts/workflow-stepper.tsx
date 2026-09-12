import { Check } from 'lucide-react';

type StepState = 'done' | 'current' | 'upcoming';

type Step = {
  key: string;
  label: string;
  state: StepState;
};

/**
 * A horizontal stepper showing the contract lifecycle at a glance.
 * The current step is highlighted; completed steps show a check.
 */
export function WorkflowStepper({
  current,
}: {
  current:
    | 'pending_signature'
    | 'active'
    | 'pending_payout'
    | 'completed'
    | 'cancelled'
    | 'disputed';
}) {
  // Map contract status to a step in our linear flow. 'cancelled' and
  // 'disputed' surface as a stopped-state banner in the page itself; the
  // stepper shows the last step the contract reached.
  const order: Array<{
    key: Step['key'];
    label: string;
    matches: Set<string>;
  }> = [
    {
      key: 'brand_signed',
      label: 'Brand signed',
      matches: new Set([
        'active',
        'pending_payout',
        'completed',
        // pending_signature: brand has signed, creator hasn't
        'pending_signature',
      ]),
    },
    {
      key: 'creator_signed',
      label: 'Creator signed',
      matches: new Set(['active', 'pending_payout', 'completed']),
    },
    {
      key: 'in_progress',
      label: 'Work in progress',
      matches: new Set(['active', 'pending_payout', 'completed']),
    },
    {
      key: 'reviewed',
      label: 'Reviewed',
      matches: new Set(['pending_payout', 'completed']),
    },
    {
      key: 'completed',
      label: 'Completed',
      matches: new Set(['completed']),
    },
  ];

  // pending_signature: the brand has signed and the creator has not.
  // Highlight the "Brand signed" step as the last completed, and add a
  // "Creator signing" message underneath.
  if (current === 'pending_signature') {
    const steps: Step[] = order.map((s) =>
      s.key === 'brand_signed'
        ? { key: s.key, label: s.label, state: 'current' }
        : { key: s.key, label: s.label, state: 'upcoming' },
    );
    return (
      <div
        className="cc-panel p-4 md:p-5 mb-6"
        data-testid="workflow-stepper"
        aria-label="Contract progress"
      >
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" role="list">
          {steps.map((s, i) => (
            <StepDot key={s.key} step={s} index={i} total={steps.length} />
          ))}
        </ol>
        <p className="text-xs cc-subtle mt-2">
          Brand has signed. Awaiting creator signature to start work.
        </p>
      </div>
    );
  }

  // cancelled / disputed: a stopped state. Show the last active step as
  // current and a clear note about the state.
  if (current === 'cancelled' || current === 'disputed') {
    return (
      <div
        className="cc-panel p-4 md:p-5 mb-6 border-2 border-rose-200 bg-rose-50/40"
        data-testid="workflow-stepper"
        aria-label="Contract progress"
      >
        <p className="text-xs text-rose-700 uppercase tracking-wider font-semibold">
          {current === 'cancelled' ? 'Cancelled' : 'Dispute opened'}
        </p>
        <p className="text-sm mt-1">
          {current === 'cancelled'
            ? 'This collaboration is closed. No further milestones can be approved.'
            : 'A dispute has been opened. An admin will review and resolve.'}
        </p>
      </div>
    );
  }

  // Default linear flow. Find the LAST index in `order` that matches
  // the current status; earlier matching ones are done.
  const steps: Step[] = order.map((s, i) => {
    if (s.matches.has(current)) {
      let lastMatchingIndex = -1;
      for (let j = order.length - 1; j >= 0; j--) {
        const o = order[j];
        if (o && o.matches.has(current)) {
          lastMatchingIndex = j;
          break;
        }
      }
      if (lastMatchingIndex === i) {
        return { key: s.key, label: s.label, state: 'current' };
      }
      return { key: s.key, label: s.label, state: 'done' };
    }
    return { key: s.key, label: s.label, state: 'upcoming' };
  });

  // pending_payout is a special case — work is fully done, money is
  // releasing. Surface it as the "current" step regardless of order.
  if (current === 'pending_payout') {
    return (
      <div
        className="cc-panel p-4 md:p-5 mb-6"
        data-testid="workflow-stepper"
        aria-label="Contract progress"
      >
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" role="list">
          {steps.map((s, i) => (
            <StepDot key={s.key} step={s} index={i} total={steps.length} />
          ))}
        </ol>
        <p className="text-xs cc-subtle mt-2">
          Funds are being released. This contract will close once payment completes.
        </p>
      </div>
    );
  }

  return (
    <div
      className="cc-panel p-4 md:p-5 mb-6"
      data-testid="workflow-stepper"
      aria-label="Contract progress"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" role="list">
        {steps.map((s, i) => (
          <StepDot key={s.key} step={s} index={i} total={steps.length} />
        ))}
      </ol>
    </div>
  );
}

function StepDot({ step, index, total }: { step: Step; index: number; total: number }) {
  const dotClass =
    step.state === 'done'
      ? 'bg-anjuman-purple text-white'
      : step.state === 'current'
        ? 'bg-anjuman-purple text-white ring-2 ring-anjuman-purple/30 ring-offset-2'
        : 'bg-anjuman-line text-anjuman-ink-soft';
  const labelClass =
    step.state === 'upcoming' ? 'text-anjuman-ink-soft' : 'text-anjuman-ink font-medium';
  return (
    <li className="flex items-center gap-2">
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold ${dotClass}`}
        aria-hidden
      >
        {step.state === 'done' ? <Check size={12} /> : index + 1}
      </span>
      <span className={labelClass}>{step.label}</span>
      {index < total - 1 && <span className="text-anjuman-line">·</span>}
    </li>
  );
}
