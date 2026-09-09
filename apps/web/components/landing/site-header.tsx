'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

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
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="hidden lg:flex items-center gap-2 text-sm text-anjuman-ink-soft"
            >
              <LogOut size={16} /> Sign out
            </button>
          ) : (
            <>
              <Link href="/signin" className="hidden sm:inline text-sm font-medium">
                Sign in
              </Link>
              <Link
                href="/signin?callbackUrl=/onboarding/role"
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
          {session ? (
            <button
              className="py-3 text-left text-sm"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Sign out
            </button>
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
                href="/signin?callbackUrl=/onboarding/role"
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
