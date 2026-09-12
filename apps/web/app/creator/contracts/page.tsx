import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { WorkspaceNav } from '@/components/workspace-nav';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusPill, contractTone } from '@/components/ui/status-pill';
import {
  ContractCard,
  ContractCardData,
} from '@/components/contracts/contract-card';
import {
  CONTRACT_STATUS_LABEL,
  isContractStatus,
  formatPKRAmount,
} from '@/lib/contracts';

export const dynamic = 'force-dynamic';

export default async function CreatorContractsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/creator/contracts');
  if (session.user.role !== 'creator') redirect('/onboarding/role');

  const rows = await db.contract.findMany({
    where: { creatorId: session.user.id },
    include: {
      brand: { select: { name: true, brandProfile: { select: { company: true } } } },
      campaign: { select: { title: true } },
      milestones: {
        orderBy: { dueDate: 'asc' },
        select: { id: true, title: true, amount: true, dueDate: true, status: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const cards: ContractCardData[] = rows.map((c) => ({
    id: c.id,
    status: c.status,
    agreedRate: c.agreedRate,
    createdAt: c.createdAt,
    milestones: c.milestones,
    campaign: c.campaign,
    counterparty: {
      label: c.brand.brandProfile?.company || c.brand.name || 'Brand',
      href: '/brand/profile',
    },
    detailHref: '/creator/contracts/' + c.id,
  }));

  // For a creator, "awaiting your signature" = the creator still has to sign.
  // "Active" also includes 'pending_payout' so a contract whose money is
  // still in flight stays visible in the workspace, not in 'closed'.
  const awaiting = cards.filter((c) => c.status === 'pending_signature');
  const active = cards.filter((c) => c.status === 'active' || c.status === 'pending_payout');
  const closed = cards.filter((c) =>
    ['completed', 'cancelled', 'disputed'].includes(c.status),
  );
  const open = awaiting.length + active.length;

  return (
    <main className="cc-container py-9 md:py-12">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Workspace', href: '/creator/dashboard' },
          { label: 'Contracts' },
        ]}
      />
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10 mt-6">
        <aside>
          <WorkspaceNav role="creator" active="contracts" />
        </aside>
        <div className="min-w-0">
          <p className="cc-eyebrow mb-3">Where you and brands meet to make the work</p>
          <h1 className="cc-title">Your contracts</h1>
          <p className="cc-subtle mt-3 mb-8">
            Every collaboration you&rsquo;ve signed on to, with deadlines, milestones, and the conversation that ties it all together.
          </p>

          {open === 0 ? (
            <EmptyState
              variant="contracts"
              title="No active contracts yet"
              body="When a brand invites you to collaborate, the deal lands here — milestones, deliverables, and sign-offs in one place."
              cta={{ href: '/creator/campaigns', label: 'Browse opportunities' }}
              secondaryCta={{ href: '/creator/applications', label: 'See your applications →' }}
            />
          ) : (
            <>
              {awaiting.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-xl font-semibold mb-4">
                    Awaiting your signature ({awaiting.length})
                  </h2>
                  <ul className="space-y-4">
                    {awaiting.map((c) => (
                      <ContractCard key={c.id} c={c} viewer="creator" />
                    ))}
                  </ul>
                </section>
              )}

              {active.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-xl font-semibold mb-4">Active ({active.length})</h2>
                  <ul className="space-y-4">
                    {active.map((c) => (
                      <ContractCard key={c.id} c={c} viewer="creator" />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {closed.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Closed ({closed.length})</h2>
              <ul className="space-y-3">
                {closed.map((c) => {
                  const status = isContractStatus(c.status) ? c.status : 'completed';
                  return (
                    <li
                      key={c.id}
                      className="cc-panel p-4 flex justify-between items-center cc-row-hover"
                    >
                      <div>
                        <StatusPill tone={contractTone(status)}>
                          {CONTRACT_STATUS_LABEL[status]}
                        </StatusPill>
                        <Link
                          href={'/creator/contracts/' + c.id}
                          className="font-medium mt-1.5 block hover:text-anjuman-purple"
                        >
                          {c.campaign?.title || 'Direct collaboration'}
                        </Link>
                      </div>
                      <p className="cc-subtle text-sm">{formatPKRAmount(c.agreedRate)}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
