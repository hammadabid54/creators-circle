import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { WorkspaceNav } from '@/components/workspace-nav';
import { formatPKRCompact } from '@/lib/utils';
export default async function BrandDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'brand') redirect('/onboarding/role');
  const [profile, campaigns, pending] = await Promise.all([
    db.brandProfile.findUnique({ where: { userId: session.user.id } }),
    db.campaign.findMany({
      where: { brandId: session.user.id },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.application.count({ where: { campaign: { brandId: session.user.id }, status: 'pending' } }),
  ]);
  return (
    <main className="cc-container py-8 md:py-12">
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10">
        <aside>
          <WorkspaceNav role="brand" />
        </aside>
        <div className="min-w-0">
          <div className="flex flex-wrap justify-between gap-5 items-end mb-8">
            <div>
              <p className="cc-eyebrow mb-3">{profile?.company || 'Your brand'}</p>
              <h1 className="cc-title">Make your next move.</h1>
              <p className="cc-subtle mt-3">
                Your campaigns, your conversations, your next collaboration.
              </p>
            </div>
            <Link className="cc-button" href="/brand/campaigns/new">
              Create a campaign <ArrowUpRight size={16} />
            </Link>
          </div>
          <section className="bg-[#392333] text-white rounded-xl p-6 md:p-8 mb-8">
            <p className="text-xs text-[#dfc5d4] uppercase tracking-widest mb-3">
              Needs your attention
            </p>
            <h2 className="text-2xl font-medium">
              {pending
                ? pending + ' proposal' + (pending === 1 ? ' is' : 's are') + ' ready to review.'
                : !profile?.industry
                  ? 'Let creators get to know your brand.'
                  : campaigns.length
                    ? 'Your workspace is up to date.'
                    : 'Every collaboration starts with a brief.'}
            </h2>
            <p className="text-sm text-[#e0cfd9] mt-3 mb-5 max-w-xl">
              {pending
                ? 'Get to know the people behind the proposals and find your fit.'
                : !profile?.industry
                  ? 'Add your industry and company details so creators understand who they’ll be working with.'
                  : campaigns.length
                    ? 'Explore the community while you wait for new proposals.'
                    : 'Share your goals, deliverables, and budget. Give creators something to get excited about.'}
            </p>
            <Link
              className="inline-flex gap-2 items-center text-sm font-semibold"
              href={
                pending
                  ? '/brand/campaigns'
                  : !profile?.industry
                    ? '/brand/onboarding'
                    : campaigns.length
                      ? '/creators'
                      : '/brand/campaigns/new'
              }
            >
              {pending
                ? 'Review proposals'
                : !profile?.industry
                  ? 'Complete brand profile'
                  : campaigns.length
                    ? 'Discover creators'
                    : 'Write your first brief'}
              <ArrowUpRight size={16} />
            </Link>
          </section>
          <div className="grid grid-cols-3 border-y border-anjuman-line py-5 mb-9 gap-4">
            {[
              ['Open campaigns', campaigns.filter((c) => c.status === 'open').length],
              ['Awaiting review', pending],
              ['Total proposals', campaigns.reduce((n, c) => n + c._count.applications, 0)],
            ].map(([label, n]) => (
              <div key={String(label)}>
                <p className="text-2xl font-semibold">{n}</p>
                <p className="cc-subtle text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
          <section>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold">Your campaigns</h2>
              <Link className="cc-link text-sm" href="/brand/campaigns">
                View all
              </Link>
            </div>
            {campaigns.length ? (
              <div className="cc-panel divide-y divide-anjuman-line">
                {campaigns.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={'/brand/campaigns/' + c.id}
                    className="p-5 flex flex-wrap justify-between items-center gap-4 hover:bg-anjuman-bg"
                  >
                    <div>
                      <span className="text-xs text-anjuman-purple capitalize">{c.status}</span>
                      <h3 className="font-semibold mt-1">{c.title}</h3>
                      <p className="cc-subtle mt-1">
                        {formatPKRCompact(c.budgetMin)} – {formatPKRCompact(c.budgetMax)} ·{' '}
                        {c._count.applications} proposals
                      </p>
                    </div>
                    <ArrowUpRight size={20} className="text-anjuman-purple" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="cc-panel p-10 text-center">
                <FileText
                  size={28}
                  className="mx-auto text-anjuman-purple mb-4"
                  strokeWidth={1.4}
                />
                <h3 className="text-xl font-semibold">A blank page. Plenty of possibility.</h3>
                <p className="cc-subtle mt-2 mb-5">Your campaign briefs will live here.</p>
                <Link href="/brand/campaigns/new" className="cc-button cc-button-secondary">
                  Create a campaign
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
