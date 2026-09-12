'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Bell, ChevronDown, LayoutDashboard, LogOut, Settings, UserCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export function UserMenu() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Poll the unread-count endpoint every 30s. Cheap (one indexed count)
  // and keeps the badge current without requiring SSE / push.
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch('/api/notifications/unread-count', { cache: 'no-store' });
        if (!r.ok) return;
        const data = (await r.json()) as { count?: number };
        if (!cancelled) setUnread(data.count ?? 0);
      } catch {
        // network blip, ignore
      }
    }
    tick();
    const t = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [session?.user, pathname]);

  // Close the menu on route change and on outside click / Escape.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!session?.user) return null;
  const role = session.user.role;
  const name = session.user.name || session.user.email || 'You';
  const dashboard =
    role === 'admin'
      ? '/admin/discovery'
      : role === 'brand'
        ? '/brand/dashboard'
        : role === 'creator'
          ? '/creator/dashboard'
          : '/onboarding/role';
  const profileHref =
    role === 'brand'
      ? '/brand/onboarding'
      : role === 'creator'
        ? '/creator/onboarding'
        : '/account';

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      {unread > 0 && (
        <span
          aria-label={`${unread} unread notifications`}
          data-testid="notification-bell"
          className="inline-flex items-center gap-1 text-xs text-anjuman-purple font-semibold"
        >
          <Bell size={14} />
          {unread > 99 ? '99+' : unread}
        </span>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-anjuman-line bg-white hover:border-anjuman-purple/40 transition"
      >
        <Avatar name={name} size="sm" />
        <ChevronDown
          size={14}
          className={'text-anjuman-ink-soft transition ' + (open ? 'rotate-180' : '')}
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 mt-2 w-64 bg-white border border-anjuman-line rounded-2xl shadow-lg overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-anjuman-line">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-xs text-anjuman-ink-soft truncate">
              {role === 'brand'
                ? 'Brand account'
                : role === 'creator'
                  ? 'Creator account'
                  : role === 'admin'
                    ? 'Admin'
                    : 'Signed in'}
            </p>
          </div>
          <Link
            role="menuitem"
            href={dashboard}
            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[#faf8f5]"
          >
            <LayoutDashboard size={16} className="text-anjuman-purple" />
            <span>My dashboard</span>
          </Link>
          <Link
            role="menuitem"
            href={profileHref}
            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[#faf8f5]"
          >
            <UserCircle size={16} className="text-anjuman-purple" />
            <span>{role === 'brand' ? 'Brand profile' : 'My profile'}</span>
          </Link>
          <Link
            role="menuitem"
            href="/account"
            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[#faf8f5]"
          >
            <Settings size={16} className="text-anjuman-purple" />
            <span>Account settings</span>
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-[#faf8f5] border-t border-anjuman-line"
          >
            <LogOut size={16} className="text-anjuman-ink-soft" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
