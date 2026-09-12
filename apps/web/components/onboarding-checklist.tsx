import Link from 'next/link';
import {
  UserCircle2,
  Megaphone,
  UserPlus,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';

export type ChecklistItem = {
  /** Stable id used for the key prop only. */
  id: string;
  title: string;
  /** Why this matters — short, one line. */
  why: string;
  /** CTA href. */
  href: string;
  /** CTA label. */
  ctaLabel: string;
  /** True when this step is complete. */
  done: boolean;
};

export type ChecklistRole = 'brand' | 'creator';

const ROLE_INTRO: Record<ChecklistRole, { title: string; subtitle: string }> = {
  brand: {
    title: 'Welcome — let us set up your brand',
    subtitle:
      'Three quick steps before your first creator can apply. You can skip ahead and come back later.',
  },
  creator: {
    title: 'Welcome — let us get your kit ready',
    subtitle:
      'Three quick steps before brands can discover and invite you. You can skip ahead and come back later.',
  },
};

export function OnboardingChecklist({
  role,
  items,
}: {
  role: ChecklistRole;
  items: ChecklistItem[];
}) {
  const intro = ROLE_INTRO[role];
  const allDone = items.every((i) => i.done);
  const doneCount = items.filter((i) => i.done).length;
  const next = items.find((i) => !i.done);

  if (allDone) {
    return (
      <div
        className="cc-panel p-5 md:p-6 bg-[var(--color-anjuman-tint-green)] border-[var(--color-anjuman-green)]/30"
        data-testid="onboarding-checklist"
        data-state="complete"
      >
        <div className="flex items-start gap-3">
          <Sparkles
            size={22}
            className="text-[var(--color-anjuman-green)] shrink-0 mt-0.5"
          />
          <div>
            <p className="font-semibold text-[var(--color-anjuman-green)]">
              You are all set!
            </p>
            <p className="text-sm text-anjuman-ink mt-1">
              Your {role === 'brand' ? 'brand' : 'creator'} profile is complete
              and ready for {role === 'brand' ? 'creators' : 'brands'} to find you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className="cc-panel p-5 md:p-6"
      data-testid="onboarding-checklist"
      data-state="incomplete"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="cc-eyebrow mb-1">Getting started</p>
          <h2 className="text-xl font-semibold">{intro.title}</h2>
          <p className="cc-subtle mt-1 text-sm">{intro.subtitle}</p>
        </div>
        <p className="text-xs text-anjuman-ink-soft whitespace-nowrap">
          {doneCount}/{items.length} done
        </p>
      </div>

      <ol className="mt-5 grid md:grid-cols-3 gap-3">
        {items.map((item, idx) => {
          const isCurrent = !item.done && items.slice(0, idx).every((i) => i.done);
          return (
            <li
              key={item.id}
              className={
                'relative rounded-xl border p-4 flex flex-col gap-3 ' +
                (item.done
                  ? 'border-[var(--color-anjuman-green)]/30 bg-[var(--color-anjuman-tint-green)]/40'
                  : isCurrent
                    ? 'border-anjuman-purple bg-[var(--color-anjuman-tint-purple)]/40'
                    : 'border-anjuman-line bg-white')
              }
              data-testid="onboarding-step"
              data-state={item.done ? 'done' : isCurrent ? 'current' : 'todo'}
            >
              <div className="flex items-center gap-2">
                <span
                  className={
                    'inline-flex w-6 h-6 rounded-full items-center justify-center text-[11px] font-bold ' +
                    (item.done
                      ? 'bg-[var(--color-anjuman-green)] text-white'
                      : isCurrent
                        ? 'bg-anjuman-purple text-white'
                        : 'bg-anjuman-line text-anjuman-ink-soft')
                  }
                >
                  {item.done ? <Check size={12} /> : idx + 1}
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-anjuman-ink-soft">
                  Step {idx + 1}
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="cc-subtle text-xs mt-1">{item.why}</p>
              </div>
              {!item.done && (
                <Link
                  href={item.href}
                  className={
                    'cc-button mt-auto text-xs ' +
                    (isCurrent ? '' : 'cc-button-secondary')
                  }
                  data-testid="onboarding-step-cta"
                >
                  {item.ctaLabel} <ArrowRight size={12} />
                </Link>
              )}
              {item.done && (
                <Link
                  href={item.href}
                  className="cc-link text-xs mt-auto inline-flex items-center gap-1"
                >
                  Update
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {next && (
        <p className="text-xs text-anjuman-ink-soft mt-4">
          Up next: <span className="font-semibold">{next.title}</span> — takes about 2 minutes.
        </p>
      )}
    </section>
  );
}

export function brandChecklistItems(opts: {
  hasCompany: boolean;
  hasIndustry: boolean;
  hasBudget: boolean;
  hasCampaign: boolean;
}): ChecklistItem[] {
  return [
    {
      id: 'profile',
      title: 'Complete your brand profile',
      why: 'Brands with logos and a clear industry get 3x more applications.',
      href: '/brand/profile',
      ctaLabel: 'Add company details',
      done: opts.hasCompany && opts.hasIndustry && opts.hasBudget,
    },
    {
      id: 'campaign',
      title: 'Create your first campaign',
      why: 'Give creators a brief to apply to. Most campaigns get proposals within 48 hours.',
      href: '/brand/campaigns/new',
      ctaLabel: 'Write a campaign brief',
      done: opts.hasCampaign,
    },
    {
      id: 'invite',
      title: 'Invite a creator you already love',
      why: 'Skip the wait — directly invite someone whose work fits your brand.',
      href: '/creators',
      ctaLabel: 'Browse creators',
      done: false, // intentionally never auto-resolves; we want a discoverable third step
    },
  ];
}

export function creatorChecklistItems(opts: {
  hasBio: boolean;
  hasNiches: boolean;
  hasCity: boolean;
  hasSlug: boolean;
  isPublished: boolean;
  hasAppliedOrInvited: boolean;
}): ChecklistItem[] {
  return [
    {
      id: 'profile',
      title: 'Complete your creator profile',
      why: 'Bio, niches, and city help brands find you in 2 seconds.',
      href: '/creator/profile',
      ctaLabel: 'Fill out your profile',
      done: opts.hasBio && opts.hasNiches && opts.hasCity && opts.hasSlug,
    },
    {
      id: 'publish',
      title: 'Publish your kit',
      why: 'Once published, brands can discover and invite you from the directory.',
      href: '/creator/onboarding',
      ctaLabel: 'Publish your kit',
      done: opts.isPublished,
    },
    {
      id: 'discover',
      title: 'Browse opportunities',
      why: 'Apply to campaigns that fit, or wait for an invitation.',
      href: '/creator/campaigns',
      ctaLabel: 'Find your first campaign',
      done: opts.hasAppliedOrInvited,
    },
  ];
}
