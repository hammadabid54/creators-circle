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
          ['discover', 'Discover creators', '/creators'],
          ['messages', 'Messages', '/messages'],
          ['profile', 'Brand profile', '/brand/onboarding'],
        ]
      : [
          ['overview', 'Overview', '/creator/dashboard'],
          ['campaigns', 'Find opportunities', '/creator/campaigns'],
          ['applications', 'Applications', '/creator/applications'],
          ['messages', 'Messages', '/messages'],
          ['profile', 'My profile', '/creator/onboarding'],
        ];
  items.push(['account', 'Account settings', '/account']);
  return (
    <nav
      aria-label="Workspace"
      className="flex lg:flex-col gap-1 overflow-x-auto border-b lg:border-b-0 border-anjuman-line pb-4 lg:pb-0 mb-6 lg:mb-0 lg:sticky lg:top-28"
    >
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
    </nav>
  );
}
