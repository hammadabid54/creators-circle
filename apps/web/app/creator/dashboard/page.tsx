import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, Check, Circle, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseList } from '@/lib/creators';
import { WorkspaceNav } from '@/components/workspace-nav';
import { formatPKRCompact } from '@/lib/utils';
export default async function CreatorDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'creator') redirect('/onboarding/role');
  const [user, applications, campaigns] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      include: { creatorProfile: { include: { socialAccounts: true, rateCard: true } } },
    }),
    db.application.findMany({
      where: { creatorId: session.user.id },
      include: { campaign: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.campaign.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      include: { brand: { select: { brandProfile: { select: { company: true } } } } },
    }),
  ]);
  const p = user?.creatorProfile;
  const niches = parseList(p?.niches);
  const matched = campaigns.filter((c) =>
    parseList(c.targetNiches).some((n) => niches.includes(n)),
  );
  const checklist = [
    { label: 'Introduce yourself', done: !!p?.bio },
    { label: 'Add a social account', done: !!p?.socialAccounts.length },
    { label: 'Choose your niches and city', done: !!niches.length && !!p?.city },
    { label: 'List your services and rates', done: !!p?.rateCard },
  ];
  const complete = checklist.filter((c) => c.done).length;
  const needsConnection = p?.socialAccounts.some((s) =>
    ['expired', 'revoked'].includes(s.connectionState),
  );
  return (
    <main className="cc-container py-8 md:py-12">
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10">
        <aside>
          <WorkspaceNav role="creator" />
        </aside>
        <div className="min-w-0">
          <div className="flex flex-wrap justify-between gap-4 items-end mb-8">
            <div>
              <p className="cc-eyebrow mb-3">Your creative workspace</p>
              <h1 className="cc-title">
                Good to see you, {user?.name?.split(' ')[0] || 'creator'}.
              </h1>
              <p className="cc-subtle mt-3">A little progress today. New possibilities tomorrow.</p>
            </div>
            <Link className="cc-button cc-button-secondary" href={'/creators/' + session.user.id}>
              View my profile <ArrowUpRight size={16} />
            </Link>
          </div>
          <section className="bg-[#392333] text-white rounded-xl p-6 md:p-8 mb-8">
            <p className="text-xs text-[#dfc5d4] uppercase tracking-widest mb-3">Your next step</p>
            <h2 className="text-2xl font-medium">
              {complete < 4
                ? 'Give your talent a home.'
                : needsConnection
                  ? 'One of your connections needs attention.'
                  : matched.length
                    ? matched.length + ' opportunities match your interests.'
                    : 'Ready for your next collaboration?'}
            </h2>
            <p className="text-sm text-[#e0cfd9] mt-3 mb-5 max-w-xl">
              {complete < 4
                ? 'Complete your profile so brands can understand your work and what you offer.'
                : needsConnection
                  ? 'Reconnect your account to keep your profile current.'
                  : 'Explore campaign briefs and put your perspective forward.'}
            </p>
            <Link
              className="inline-flex gap-2 items-center text-sm font-semibold"
              href={complete < 4 || needsConnection ? '/creator/onboarding' : '/creator/campaigns'}
            >
              {complete < 4 || needsConnection ? 'Update your profile' : 'Explore opportunities'}
              <ArrowUpRight size={16} />
            </Link>
          </section>
          <div className="grid xl:grid-cols-[1fr_280px] gap-7">
            <section>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-semibold">Opportunities for you</h2>
                <Link href="/creator/campaigns" className="cc-link text-sm">
                  View all
                </Link>
              </div>
              {(matched.length ? matched : campaigns).length ? (
                <div className="cc-panel divide-y divide-anjuman-line">
                  {(matched.length ? matched : campaigns).slice(0, 4).map((c) => (
                    <Link
                      key={c.id}
                      href={'/creator/campaigns/' + c.id}
                      className="block p-5 hover:bg-anjuman-bg"
                    >
                      <p className="text-xs text-anjuman-purple mb-1">
                        {c.brand.brandProfile?.company || 'Brand campaign'}
                      </p>
                      <h3 className="font-semibold">{c.title}</h3>
                      <p className="cc-subtle mt-2">
                        {formatPKRCompact(c.budgetMin)} – {formatPKRCompact(c.budgetMax)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="cc-panel p-8 text-center">
                  <FileText size={26} className="mx-auto text-anjuman-purple mb-4" />
                  <h3 className="font-semibold">Your next opportunity is on its way.</h3>
                  <p className="cc-subtle mt-2">Open campaign briefs will appear here.</p>
                </div>
              )}
              <h2 className="text-xl font-semibold mt-8 mb-5">Recent applications</h2>
              {applications.length ? (
                <div className="cc-panel divide-y divide-anjuman-line">
                  {applications.slice(0, 4).map((a) => (
                    <Link
                      key={a.id}
                      href="/creator/applications"
                      className="p-4 flex flex-wrap gap-3 justify-between text-sm"
                    >
                      <span>{a.campaign.title}</span>
                      <span className="capitalize text-anjuman-purple">{a.status}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="cc-subtle">No applications yet. Find a brief that feels like you.</p>
              )}
            </section>
            <aside className="cc-panel p-5 self-start">
              <h2 className="font-semibold mb-2">Your profile, at a glance.</h2>
              <p className="cc-subtle text-xs mb-4">{complete} of 4 essentials complete</p>
              <progress
                value={complete}
                max={4}
                aria-label="Profile completeness"
                className="w-full h-1.5 accent-[#582d46] mb-5"
              />
              <ul className="space-y-4">
                {checklist.map((c) => (
                  <li key={c.label} className="flex gap-2 text-sm items-start">
                    {c.done ? (
                      <Check size={17} className="text-[#287052] shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={15} className="text-anjuman-ink-soft shrink-0 mt-0.5" />
                    )}
                    {c.label}
                  </li>
                ))}
              </ul>
              <Link href="/creator/onboarding" className="cc-link text-sm inline-block mt-6">
                Edit profile →
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
