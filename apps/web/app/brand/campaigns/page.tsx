import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { WorkspaceNav } from '@/components/workspace-nav';
import { formatPKRCompact } from '@/lib/utils';
export default async function BrandCampaignsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'brand') redirect('/onboarding/role');
  const campaigns = await db.campaign.findMany({
    where: { brandId: session.user.id },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <main className="cc-container py-9 md:py-12">
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10">
        <aside>
          <WorkspaceNav role="brand" active="campaigns" />
        </aside>
        <div className="min-w-0">
          <div className="flex flex-wrap justify-between gap-4 items-end mb-8">
            <div>
              <p className="cc-eyebrow mb-3">Your ideas, in motion</p>
              <h1 className="cc-title">Campaigns</h1>
              <p className="cc-subtle mt-3">A home for every brief and the people who answer it.</p>
            </div>
            <Link href="/brand/campaigns/new" className="cc-button">
              New campaign
              <ArrowUpRight size={16} />
            </Link>
          </div>
          {campaigns.length ? (
            <div className="cc-panel divide-y divide-anjuman-line">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  href={'/brand/campaigns/' + c.id}
                  className="p-5 md:p-6 flex flex-wrap justify-between items-center gap-4 hover:bg-anjuman-bg"
                >
                  <div>
                    <span className="text-xs text-anjuman-purple capitalize">{c.status}</span>
                    <h2 className="text-lg font-semibold mt-1">{c.title}</h2>
                    <p className="cc-subtle mt-2">
                      {formatPKRCompact(c.budgetMin)} – {formatPKRCompact(c.budgetMax)}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="text-sm text-anjuman-ink-soft">
                      {c._count.applications} proposals
                    </span>
                    <ArrowUpRight size={20} className="text-anjuman-purple" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="cc-panel p-12 text-center">
              <FileText className="mx-auto text-anjuman-purple mb-4" size={28} />
              <h2 className="text-2xl font-semibold">What will you create first?</h2>
              <p className="cc-subtle mt-3 mb-6">
                Share a brief and give creators a reason to get involved.
              </p>
              <Link href="/brand/campaigns/new" className="cc-button cc-button-secondary">
                Write a campaign brief
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
