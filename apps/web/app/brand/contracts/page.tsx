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

export default async function BrandContractsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/brand/contracts');
  if (session.user.role !== 'brand') redirect('/onboarding/role');

  const rows = await db.contract.findMany({
    where: { brandId: session.user.id },
    include: {
      creator: {
        select: { name: true, creatorProfile: { select: { slug: true } } },
      },
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
      label: c.creator.name || 'Creator',
      href: '/creators/' + (c.creator.creatorProfile?.slug || c.creatorId),
    },
    detailHref: '/brand/contracts/' + c.id,
  }));

  // For a brand, "awaiting their signature" = the creator still has to sign.
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
          { label: 'Workspace', href: '/brand/dashboard' },
          { label: 'Contracts' },
        ]}
      />
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10 mt-6">
        <aside>
          <WorkspaceNav role="brand" active="contracts" />
        </aside>
        <div className="min-w-0">
          <p className="cc-eyebrow mb-3">Every collaboration, in one place</p>
          <h1 className="cc-title">Your contracts</h1>
          <p className="cc-subtle mt-3 mb-8">
            Track signed work, deadlines, and milestone approvals for every creator you&rsquo;ve hired.
          </p>

          {open === 0 ? (
            <EmptyState
              variant="contracts"
              title="No active contracts yet"
              body="When a creator accepts a proposal or an invitation, the deal lands here — milestones, sign-offs, and approvals in one place."
              cta={{ href: '/brand/campaigns', label: 'View your campaigns' }}
              secondaryCta={{ href: '/creators', label: 'Browse creators →' }}
            />
          ) : (
            <>
              {awaiting.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-xl font-semibold mb-4">
                    Awaiting their signature ({awaiting.length})
                  </h2>
                  <ul className="space-y-4">
                    {awaiting.map((c) => (
                      <ContractCard key={c.id} c={c} viewer="brand" />
                    ))}
                  </ul>
                </section>
              )}

              {active.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-xl font-semibold mb-4">Active ({active.length})</h2>
                  <ul className="space-y-4">
                    {active.map((c) => (
                      <ContractCard key={c.id} c={c} viewer="brand" />
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
                          href={'/brand/contracts/' + c.id}
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
