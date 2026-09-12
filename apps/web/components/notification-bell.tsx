'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, string | number | boolean | null>;
  read: boolean;
  createdAt: string;
};

type ListResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

/** Map a notification payload to the most useful deep-link. */
function hrefFor(
  type: string,
  payload: Record<string, string | number | boolean | null>,
): string {
  const contractId = payload.contractId as string | undefined;
  const threadId = payload.threadId as string | undefined;
  const applicationId = payload.applicationId as string | undefined;

  if (contractId) {
    // Routes to /messages/[id] when a thread is involved, /brand or /creator
    // contract page when not.
    if (threadId) return `/messages/${threadId}`;
    if (type.startsWith('milestone.') || type === 'work.submitted') {
      // Both sides benefit from the messages thread view.
      return `/messages/${contractId}`;
    }
    return `/brand/contracts/${contractId}`;
  }
  if (threadId) return `/messages/${threadId}`;
  if (applicationId) return `/creator/applications`;
  switch (type) {
    case 'application.invited':
    case 'application.shortlisted':
    case 'application.status_changed':
      return '/creator/applications';
    case 'kyc.status_changed':
      return '/account/settings';
    default:
      return '/messages';
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/list?limit=10');
      if (!res.ok) return;
      const data = (await res.json()) as ListResponse;
      setItems(data.items ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // best-effort
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
    const t = setInterval(fetchList, 30_000);
    return () => clearInterval(t);
  }, [fetchList]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    setItems((prev) =>
      prev.map((i) => (ids.includes(i.id) ? { ...i, read: true } : i)),
    );
    setUnread((n) => Math.max(0, n - ids.length));
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } catch {
      // ignore — next poll will reconcile
    }
  }

  async function markAllRead() {
    const unreadIds = items.filter((i) => !i.read).map((i) => i.id);
    await markRead(unreadIds);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications, ${unread} unread`}
        className={cn(
          'relative w-10 h-10 inline-flex items-center justify-center rounded-full border border-anjuman-line bg-white hover:bg-anjuman-hover transition-colors',
        )}
        data-testid="notification-bell"
      >
        <Bell size={18} className="text-anjuman-ink" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-anjuman-red)] text-white text-[10px] font-bold inline-flex items-center justify-center"
            data-testid="notification-unread-badge"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 w-[360px] max-w-[92vw] bg-white border border-anjuman-line rounded-xl shadow-[0_12px_28px_rgba(0,0,0,0.12)] overflow-hidden z-50"
          data-testid="notification-dropdown"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-anjuman-line">
            <p className="font-semibold text-sm">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="cc-link text-xs inline-flex items-center gap-1"
                data-testid="notification-mark-all-read"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {loading && items.length === 0 ? (
            <div className="p-6 text-center cc-subtle text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center">
              <p className="cc-subtle text-sm">
                You are all caught up. New activity will appear here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto divide-y divide-anjuman-line">
              {items.map((i) => {
                const href = hrefFor(i.type, i.payload);
                return (
                  <li key={i.id}>
                    <Link
                      href={href}
                      onClick={() => {
                        if (!i.read) void markRead([i.id]);
                        setOpen(false);
                      }}
                      className={cn(
                        'block px-4 py-3 hover:bg-anjuman-hover transition-colors',
                        !i.read && 'bg-[var(--color-anjuman-tint-purple)]/40',
                      )}
                      data-testid="notification-item"
                      data-read={i.read ? 'true' : 'false'}
                    >
                      <p className="text-sm font-medium leading-snug">{i.title}</p>
                      {i.body && (
                        <p className="text-xs text-anjuman-ink-soft mt-0.5 leading-snug line-clamp-2">
                          {i.body}
                        </p>
                      )}
                      <p className="text-[11px] text-anjuman-ink-soft mt-1">
                        {timeAgo(i.createdAt)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="px-4 py-2 border-t border-anjuman-line bg-anjuman-bg/50">
            <Link
              href="/notifications"
              className="cc-link text-xs"
              onClick={() => setOpen(false)}
            >
              See all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
