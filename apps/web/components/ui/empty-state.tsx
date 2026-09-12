import Link from 'next/link';
import {
  Briefcase,
  ClipboardList,
  Inbox,
  Megaphone,
  Search,
  UserPlus,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

/**
 * Visual variants for the illustration. Each one is a Burst Cluster
 * composition — geometric, brand-aligned, no stock art.
 */
export type EmptyVariant =
  | 'contracts'
  | 'applications'
  | 'campaigns'
  | 'conversations'
  | 'creators'
  | 'opportunities'
  | 'notifications'
  | 'generic';

const ICONS: Record<EmptyVariant, LucideIcon> = {
  contracts: ClipboardList,
  applications: Briefcase,
  campaigns: Megaphone,
  conversations: MessageSquare,
  creators: UserPlus,
  opportunities: Search,
  notifications: Inbox,
  generic: Inbox,
};

const DEFAULT_TITLE: Record<EmptyVariant, string> = {
  contracts: 'No contracts yet',
  applications: 'No applications yet',
  campaigns: 'No campaigns yet',
  conversations: 'No conversations yet',
  creators: 'No creators yet',
  opportunities: 'Nothing matches yet',
  notifications: 'You are all caught up',
  generic: 'Nothing here yet',
};

const DEFAULT_BODY: Record<EmptyVariant, string> = {
  contracts:
    'When a brand accepts your proposal or you accept an invitation, the deal lives here.',
  applications:
    'Apply to a campaign or wait for an invitation. Either way, this is where conversations start.',
  campaigns:
    'Create a campaign to start inviting creators to apply. They will see it under Find Opportunities.',
  conversations:
    'When a deal is in motion, every conversation with that partner lives in the sidebar.',
  creators:
    'Browse the directory to discover creators by city, niche, or platform.',
  opportunities:
    'Try widening your filters or check back soon — new campaigns are added every week.',
  notifications: 'Nothing new right now. We will let you know when something needs your attention.',
  generic: 'There is nothing to show here yet.',
};

export type EmptyStateProps = {
  variant?: EmptyVariant;
  title?: string;
  body?: string;
  /** Primary CTA — renders as a filled button. */
  cta?: {
    href: string;
    label: string;
  };
  /** Secondary CTA — renders as a text link. */
  secondaryCta?: {
    href: string;
    label: string;
  };
  className?: string;
};

export function EmptyState({
  variant = 'generic',
  title,
  body,
  cta,
  secondaryCta,
  className = '',
}: EmptyStateProps) {
  const Icon = ICONS[variant];
  return (
    <div
      className={
        'cc-panel text-center px-6 py-14 md:py-20 ' + className
      }
      data-testid="empty-state"
      data-variant={variant}
    >
      <BurstClusterIcon variant={variant} />
      <h3 className="text-xl md:text-2xl font-semibold mt-5">
        {title ?? DEFAULT_TITLE[variant]}
      </h3>
      <p className="cc-subtle mt-3 max-w-md mx-auto">
        {body ?? DEFAULT_BODY[variant]}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="cc-button mt-7 inline-flex"
          data-testid="empty-state-cta"
        >
          <Icon size={16} /> {cta.label}
        </Link>
      )}
      {secondaryCta && (
        <div className="mt-4">
          <Link href={secondaryCta.href} className="cc-link text-sm">
            {secondaryCta.label}
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Burst Cluster illustration. 4 nested circles in the brand plum with
 * one accent in lime/yellow. Pure SVG, ~80px, scales to the slot.
 */
function BurstClusterIcon({ variant }: { variant: EmptyVariant }) {
  const accent = variant === 'opportunities' ? '#e7c993' : '#a3e635';
  const secondary = variant === 'conversations' ? '#f5e6cf' : '#f4e9ed';
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="mx-auto"
    >
      <circle cx="60" cy="60" r="56" fill="var(--color-anjuman-tint-purple)" />
      <circle cx="60" cy="60" r="40" fill="var(--color-anjuman-tint-pink)" opacity="0.7" />
      <circle cx="74" cy="46" r="14" fill={secondary} />
      <circle cx="74" cy="46" r="9" fill="var(--color-anjuman-purple)" />
      <circle cx="44" cy="76" r="6" fill={accent} />
    </svg>
  );
}
