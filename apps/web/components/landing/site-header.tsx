'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { UserMenu } from '@/components/user-menu';
import { NotificationBell } from '@/components/notification-bell';

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const role = session?.user?.role;
  const dashboard =
    role === 'admin'
      ? '/admin/discovery'
      : role === 'brand'
        ? '/brand/dashboard'
        : role === 'creator'
          ? '/creator/dashboard'
          : '/onboarding/role';
  const nav = [
    { href: '/discover', label: 'Discover creators' },
    { href: role === 'brand' ? '/brand/campaigns' : '/creator/campaigns', label: 'Campaigns' },
    ...(session
      ? [
          { href: '/messages', label: 'Messages' },
          { href: dashboard, label: 'Workspace' },
        ]
      : [{ href: '/#how', label: 'How it works' }]),
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-anjuman-line bg-[#faf8f5]/95 backdrop-blur-md">
      <a
        href="#page-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 cc-button"
      >
        Skip to content
      </a>
      <div className="cc-container flex h-[76px] items-center justify-between gap-5">
        <Logo />
        <nav aria-label="Primary" className="hidden lg:flex items-center gap-7 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={
                pathname === item.href
                  ? 'font-semibold text-anjuman-purple'
                  : 'text-anjuman-ink-soft hover:text-anjuman-ink'
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link
                href={dashboard}
                className="hidden sm:inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-full border border-anjuman-line bg-white hover:border-anjuman-purple/40"
              >
                My dashboard
              </Link>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Link href="/signin" className="hidden sm:inline text-sm font-medium">
                Sign in
              </Link>
              <Link
                href="/onboarding/role?intent=signup"
                className="cc-button hidden sm:inline-flex"
              >
                Join the circle
              </Link>
            </>
          )}
          <button
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg border border-anjuman-line"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="lg:hidden cc-container pb-5 grid gap-1"
        >
          {nav.map((item) => (
            <Link
              onClick={() => setOpen(false)}
              className="py-3 text-sm border-b border-anjuman-line"
              key={item.href}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
          {session && (
            <Link
              onClick={() => setOpen(false)}
              href={dashboard}
              className="py-3 text-sm border-b border-anjuman-line font-semibold text-anjuman-purple"
            >
              My dashboard
            </Link>
          )}
          {session ? (
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="py-3 text-sm border-b border-anjuman-line"
            >
              Account settings
            </Link>
          ) : (
            <div className="flex gap-3 pt-4">
              <Link
                onClick={() => setOpen(false)}
                href="/signin"
                className="cc-button cc-button-secondary flex-1"
              >
                Sign in
              </Link>
              <Link
                onClick={() => setOpen(false)}
                href="/onboarding/role?intent=signup"
                className="cc-button flex-1"
              >
                Join the circle
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
