import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseList } from '@/lib/creators';
import { WorkspaceNav } from '@/components/workspace-nav';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPKRCompact } from '@/lib/utils';
export default async function OpportunitiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/creator/campaigns');
  if (session.user.role !== 'creator') redirect('/onboarding/role');
  const [profile, campaigns, applications] = await Promise.all([
    db.creatorProfile.findUnique({ where: { userId: session.user.id }, select: { niches: true } }),
    db.campaign.findMany({
      where: { status: 'open' },
      include: { brand: { select: { brandProfile: { select: { company: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.application.findMany({
      where: { creatorId: session.user.id },
      select: { campaignId: true },
    }),
  ]);
  const niches = parseList(profile?.niches);
  const applied = new Set(applications.map((a) => a.campaignId));
  const score = (n: string) => parseList(n).filter((v) => niches.includes(v)).length;
  const sorted = [...campaigns].sort((a, b) => score(b.targetNiches) - score(a.targetNiches));
  return (
    <main className="cc-container py-9 md:py-12">
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10">
        <aside>
          <WorkspaceNav role="creator" active="campaigns" />
        </aside>
        <div className="min-w-0">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Workspace', href: '/creator/dashboard' },
              { label: 'Opportunities' },
            ]}
          />
          <div className="mt-6">
            <p className="cc-eyebrow mb-3">Find your next good thing</p>
            <h1 className="cc-title">Open opportunities</h1>
            <p className="cc-subtle mt-3 mb-8">Campaigns looking for a perspective like yours.</p>
          </div>
          {niches.length > 0 && (
            <div className="border-y border-anjuman-line py-4 mb-7 flex flex-wrap justify-between gap-3 text-sm">
              <p className="text-anjuman-ink-soft">Prioritizing {niches.slice(0, 3).join(', ')}</p>
              <Link href="/creator/onboarding" className="cc-link">
                Edit interests
              </Link>
            </div>
          )}
          <p className="cc-subtle mb-5">{campaigns.length} open campaigns</p>
          {sorted.length ? (
            <div className="grid md:grid-cols-2 gap-4">
              {sorted.map((c) => (
                <Link
                  key={c.id}
                  href={'/creator/campaigns/' + c.id}
                  className="cc-panel p-6 flex flex-col anj-card-lift"
                >
                  <div className="flex justify-between gap-3 mb-5">
                    <p className="text-xs font-semibold text-anjuman-purple">
                      {c.brand.brandProfile?.company || 'Brand campaign'}
                    </p>
                    {applied.has(c.id) ? (
                      <span className="text-xs text-[#287052]">Applied</span>
                    ) : score(c.targetNiches) > 0 ? (
                      <span className="text-xs text-anjuman-ink-soft">Matches your interests</span>
                    ) : null}
                  </div>
                  <h2 className="text-xl font-semibold">{c.title}</h2>
                  <p className="cc-subtle line-clamp-3 mt-3 mb-5">{c.brief}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {parseList(c.targetPlatforms).map((p) => (
                      <span
                        key={p}
                        className="capitalize text-xs bg-anjuman-line-soft px-2 py-1 rounded"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center border-t border-anjuman-line pt-4 mt-auto">
                    <span className="text-sm font-semibold">
                      {formatPKRCompact(c.budgetMin)} – {formatPKRCompact(c.budgetMax)}
                    </span>
                    <ArrowUpRight size={18} className="text-anjuman-purple" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              variant="opportunities"
              title="Good briefs are worth waiting for"
              body="There are no open campaigns yet. Keep your profile ready — brands post new opportunities every week."
              cta={{ href: '/creator/onboarding', label: 'Update my profile' }}
              secondaryCta={{ href: '/creators', label: 'Browse creators like you →' }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
