import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, FileText, Inbox } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { WorkspaceNav } from '@/components/workspace-nav';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { formatPKR } from '@/lib/utils';
import { ApplicationCard } from './application-card';
import { EmptyState } from '@/components/ui/empty-state';
export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'creator') redirect('/onboarding/role');
  const applications = await db.application.findMany({
    where: { creatorId: session.user.id },
    include: {
      campaign: {
        include: {
          brand: { select: { brandProfile: { select: { company: true } } } },
          contracts: { where: { creatorId: session.user.id }, select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  // Split: invites are first, so the creator sees them immediately.
  // Invites are an action item (accept / decline); proposals are status
  // updates the creator is already aware of.
  const invitations = applications.filter((a) => a.status === 'invited');
  const proposals = applications.filter((a) => a.status !== 'invited');

  return (
    <main className="cc-container py-9 md:py-12">
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10">
        <aside>
          <WorkspaceNav role="creator" active="applications" />
        </aside>
        <div>
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Workspace', href: '/creator/dashboard' },
              { label: 'Applications' },
            ]}
          />
          <div className="mt-6">
            <p className="cc-eyebrow mb-3">Keep track of your next chapter</p>
            <h1 className="cc-title">Your applications</h1>
            <p className="cc-subtle mt-3 mb-8">Invites first, your proposals below.</p>
          </div>

          {invitations.length > 0 && (
            <section className="mb-10" data-testid="invitations-section">
              <div className="flex items-center gap-2 mb-3">
                <Inbox size={18} className="text-anjuman-purple" />
                <h2 className="text-xl font-semibold">
                  Invitations ({invitations.length})
                </h2>
              </div>
              <p className="cc-subtle text-sm mb-4">
                Brands have invited you to discuss a campaign. Accept to
                start with your proposed rate, or decline to pass.
              </p>
              <div className="space-y-4">
                {invitations.map((a) => (
                  <ApplicationCard key={a.id} a={a} mode="invitation" />
                ))}
              </div>
            </section>
          )}

          {proposals.length > 0 ? (
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">Your proposals</h2>
              <div className="space-y-4">
                {proposals.map((a) => (
                  <ApplicationCard key={a.id} a={a} mode="proposal" />
                ))}
              </div>
            </section>
          ) : invitations.length === 0 ? (
            <EmptyState
              variant="applications"
              title="Find a brief that feels like you"
              body="Your proposals and invitations will land here. Brands post campaigns every week — check back often."
              cta={{ href: '/creator/campaigns', label: 'Explore opportunities' }}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
