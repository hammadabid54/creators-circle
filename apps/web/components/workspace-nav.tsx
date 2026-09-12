import Link from 'next/link';
export function WorkspaceNav({
  role,
  active = 'overview',
}: {
  role: 'brand' | 'creator';
  active?: string;
}) {
  const items =
    role === 'brand'
      ? [
          ['overview', 'Overview', '/brand/dashboard'],
          ['campaigns', 'Campaigns', '/brand/campaigns'],
          ['contracts', 'Contracts', '/brand/contracts'],
          ['discover', 'Discover creators', '/creators'],
          ['messages', 'Messages', '/messages'],
          ['profile', 'Brand profile', '/brand/onboarding'],
        ]
      : [
          ['overview', 'Overview', '/creator/dashboard'],
          ['campaigns', 'Find opportunities', '/creator/campaigns'],
          ['contracts', 'Contracts', '/creator/contracts'],
          ['applications', 'Applications', '/creator/applications'],
          ['messages', 'Messages', '/messages'],
          ['profile', 'My profile', '/creator/onboarding'],
        ];
  items.push(['account', 'Account settings', '/account']);
  // The outer <nav> is the sticky element on desktop. The inner <div>
  // carries the horizontal-scroll on mobile — keeping `overflow` on the
  // outer would break sticky positioning.
  return (
    <nav
      aria-label="Workspace"
      className="lg:sticky lg:top-24 mb-6 lg:mb-0"
    >
      <div className="flex lg:flex-col gap-1 overflow-x-auto border-b lg:border-b-0 border-anjuman-line pb-4 lg:pb-0">
        <p className="hidden lg:block cc-eyebrow mb-4">
          {role === 'brand' ? 'Brand' : 'Creator'} workspace
        </p>
        {items.map(([key, label, href]) => (
          <Link
            key={key}
            href={href!}
            aria-current={active === key ? 'page' : undefined}
            className={
              'px-3 py-3 text-sm whitespace-nowrap rounded-lg ' +
              (active === key
                ? 'bg-[#ece2e8] text-anjuman-purple font-semibold'
                : 'text-anjuman-ink-soft hover:bg-white')
            }
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
