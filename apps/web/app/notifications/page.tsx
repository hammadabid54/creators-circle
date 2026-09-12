import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, ChevronLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { drainDeliveries } from '@/lib/notifications';
import { WorkspaceNav } from '@/components/workspace-nav';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { StatusPill } from '@/components/ui/status-pill';

const TYPE_LABEL: Record<string, string> = {
  'application.invited': 'Invitation',
  'application.status_changed': 'Application update',
  'application.shortlisted': 'Shortlisted',
  'contract.signed': 'Contract signed',
  'work.submitted': 'Work submitted',
  'milestone.approved': 'Milestone approved',
  'milestone.revision_requested': 'Revision requested',
  'message.received': 'New message',
  'invite.received': 'Invite',
  'kyc.status_changed': 'KYC update',
  'dispute.opened': 'Dispute opened',
  'dispute.resolved': 'Dispute resolved',
};

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/notifications');
  const isBrand = session.user.role === 'brand';
  await drainDeliveries({ take: 50 }).catch(() => undefined);

  const items = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unread = items.filter((i) => i.readAt === null).length;

  return (
    <main className="cc-container max-w-4xl py-8 md:py-12">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Notifications' },
        ]}
      />
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10 mt-6">
        <aside>
          <WorkspaceNav role={isBrand ? 'brand' : 'creator'} active="" />
        </aside>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link
              href={isBrand ? '/brand/dashboard' : '/creator/dashboard'}
              className="cc-link text-sm inline-flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Back to dashboard
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Bell size={24} className="text-anjuman-purple" />
            <h1 className="cc-title">Notifications</h1>
            {unread > 0 && (
              <StatusPill tone="danger">{unread} unread</StatusPill>
            )}
          </div>
          <p className="cc-subtle mt-2 mb-8">
            Every deal change, message, and decision lands here. Older items are kept for 30 days.
          </p>

          {items.length === 0 ? (
            <div className="cc-panel p-10 text-center">
              <p className="cc-subtle">
                You are all caught up. New activity will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => {
                const label = TYPE_LABEL[n.type] ?? n.type;
                return (
                  <li
                    key={n.id}
                    className={`cc-panel p-4 cc-row-hover ${
                      n.readAt === null
                        ? 'border-l-4 border-[var(--color-anjuman-purple)]'
                        : ''
                    }`}
                    data-testid="notification-row"
                    data-read={n.readAt ? 'true' : 'false'}
                  >
                    <p className="text-xs uppercase tracking-wider text-anjuman-ink-soft">
                      {label}
                    </p>
                    <p className="text-sm font-medium mt-1">{n.title}</p>
                    {n.body && (
                      <p className="text-sm text-anjuman-ink-soft mt-1">{n.body}</p>
                    )}
                    <p className="text-xs text-anjuman-ink-soft mt-2">
                      {new Date(n.createdAt).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
