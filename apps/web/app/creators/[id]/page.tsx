import { SyncButton } from './sync-button';
import { CreatorAnalytics } from '@/components/creator/analytics';
import { getMetricHistory } from '@/lib/creator-metrics';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, BadgeCheck, ImageIcon, MapPin } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseList } from '@/lib/creators';
import { Avatar } from '@/components/ui/avatar';
import { SiteFooter } from '@/components/landing/site-footer';
import { formatNumber, formatPKR } from '@/lib/utils';
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      name: true,
      creatorProfile: {
        select: { bio: true, socialAccounts: { select: { connectionState: true } } },
      },
    },
  });
  return {
    title: user?.name ? user.name + ' | Creators Circle' : 'Creator | Creators Circle',
    alternates: { canonical: '/creators/' + id },
    robots: {
      index:
        !!user?.name &&
        (user.creatorProfile?.bio?.trim().length || 0) >= 40 &&
        !!user.creatorProfile?.socialAccounts.length &&
        !user.creatorProfile?.socialAccounts.some((s) => s.connectionState === 'dev_mock'),
      follow: true,
    },
    openGraph: {
      title: (user?.name || 'Creator') + ' | Creators Circle',
      description: user?.creatorProfile?.bio || 'Explore this creator?s public profile.',
      url: '/creators/' + id,
    },
  };
}
export default async function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, session] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        creatorProfile: {
          include: {
            socialAccounts: true,
            rateCard: true,
            portfolio: { orderBy: { createdAt: 'desc' } },
            brandCollabs: { orderBy: { year: 'desc' } },
            audience: true,
          },
        },
      },
    }),
    auth(),
  ]);
  if (!user?.creatorProfile) notFound();
  const profile = user.creatorProfile;
  const history = await getMetricHistory(profile.id);
  const owner = session?.user?.id === id;
  const demo = profile.socialAccounts.some((s) => s.connectionState === 'dev_mock');
  const niches = parseList(profile.niches);
  const rates = [
    { label: 'Sponsored post', price: profile.rateCard?.postRate },
    { label: 'Story', price: profile.rateCard?.storyRate },
    { label: 'Short-form reel', price: profile.rateCard?.reelRate },
    { label: 'YouTube video', price: profile.rateCard?.youtubeLongRate },
    { label: 'YouTube Short', price: profile.rateCard?.youtubeShortRate },
  ].filter((r): r is { label: string; price: number } => typeof r.price === 'number');
  const action = owner ? '/creator/onboarding' : '/brand/campaigns/new';
  return (
    <>
      <main className="cc-container pt-7 md:pt-10 pb-24 md:pb-6">
        <Link
          href="/creators"
          className="inline-flex items-center gap-2 text-sm text-anjuman-ink-soft mb-8"
        >
          <ArrowLeft size={15} />
          All creators
        </Link>
        <div className="grid lg:grid-cols-[1fr_340px] gap-10 lg:gap-14">
          <div className="min-w-0">
            <div className="flex items-center gap-5">
              <Avatar name={user.name || 'Creator'} src={user.image || undefined} size="2xl" />
              <div>
                <p className="cc-eyebrow mb-2">
                  {niches.slice(0, 2).join(' / ') || 'Independent creator'}
                </p>
                <h1 className="cc-title flex items-center flex-wrap gap-3">
                  {user.name || 'Creator'}
                  {profile.verified && (
                    <span title="Profile marked as verified">
                      <BadgeCheck size={24} className="text-anjuman-purple" />
                    </span>
                  )}
                </h1>
                <p className="cc-subtle mt-2 flex items-center gap-1.5">
                  <MapPin size={14} />
                  {profile.city || 'Pakistan'}
                  <span className="mx-2">·</span>
                  {profile.available ? 'Open to collaborations' : 'Currently unavailable'}
                </p>
              </div>
            </div>
            <p className="text-lg leading-relaxed text-anjuman-ink-soft mt-7 max-w-2xl">
              {profile.bio ||
                'This creator is putting their profile together. Explore their platforms and services below.'}
            </p>
            <div className="flex gap-2 flex-wrap mt-5">
              {niches.map((n) => (
                <span
                  key={n}
                  className="rounded-full border border-anjuman-line bg-white text-xs px-3 py-1.5"
                >
                  {n}
                </span>
              ))}
            </div>
            <nav
              aria-label="Profile sections"
              className="flex flex-wrap gap-5 text-sm border-b border-anjuman-line mt-9 mb-8 pb-4"
            >
              <a href="#work" className="cc-link">
                Selected work
              </a>
              <a href="#performance">Performance</a>
              <a href="#audience">Platforms</a>
              <a href="#about">About</a>
            </nav>
            <section id="work">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-semibold">A look at my work.</h2>
                <span className="text-xs text-anjuman-ink-soft">
                  {profile.portfolio.length} item{profile.portfolio.length === 1 ? '' : 's'}
                </span>
              </div>
              {profile.portfolio.length ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {profile.portfolio.map((item) => (
                    <a
                      key={item.id}
                      href={/^https?:\/\//.test(item.url) ? item.url : '#work'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cc-panel overflow-hidden group"
                    >
                      <div className="aspect-[1.25] bg-anjuman-line-soft">
                        {item.type === 'image' ? (
                          <Image
                            unoptimized
                            src={item.url}
                            alt={item.caption || 'Work shared by ' + user.name}
                            width={640}
                            height={512}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-anjuman-purple gap-3">
                            <ArrowUpRight size={30} />
                            <span className="text-sm">
                              View {item.type === 'video' ? 'video' : 'project'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex items-start gap-3 justify-between text-sm">
                        <span>{item.caption || 'Portfolio project'}</span>
                        <ArrowUpRight size={16} className="shrink-0" />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="cc-panel border-dashed px-7 py-12 text-center">
                  <ImageIcon
                    size={28}
                    className="mx-auto text-anjuman-purple mb-4"
                    strokeWidth={1.3}
                  />
                  <h3 className="font-semibold text-lg">A portfolio in the making.</h3>
                  <p className="cc-subtle mt-2">Work samples haven&apos;t been added yet.</p>
                  {owner && (
                    <p className="cc-subtle mt-1">
                      Your linked platforms help brands get to know your style.
                    </p>
                  )}
                </div>
              )}
            </section>
            <CreatorAnalytics
              history={history}
              accounts={profile.socialAccounts.map((s) => ({
                id: s.id,
                platform: s.platform,
                followers: s.followers,
                engagementRate: s.engagementRate,
                lastSyncedAt: s.lastSyncedAt?.toISOString() ?? null,
                connectionState: s.connectionState,
              }))}
            />
            {owner && <SyncButton />}
            <section id="audience" className="mt-10">
              <h2 className="text-2xl font-semibold mb-2">Where I create.</h2>
              <p className="cc-subtle mb-5">
                {demo
                  ? 'These accounts include demonstration metrics.'
                  : 'Statistics shared on this profile. Audience totals may overlap across platforms.'}
              </p>
              <div className="cc-panel divide-y divide-anjuman-line">
                {profile.socialAccounts.map((s) => (
                  <div key={s.id} className="p-5 flex justify-between items-center gap-4">
                    <div>
                      <h3 className="font-semibold capitalize">{s.platform}</h3>
                      <p className="cc-subtle">@{s.handle}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatNumber(s.followers)}{' '}
                        <span className="text-xs font-normal text-anjuman-ink-soft">followers</span>
                      </p>
                      <p className="text-xs text-anjuman-ink-soft mt-1">
                        {s.connectionState === 'dev_mock'
                          ? 'Demo account'
                          : s.connectionState === 'expired' || s.connectionState === 'revoked'
                            ? 'Connection needs attention'
                            : 'Profile statistics'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section id="about" className="mt-10">
              <h2 className="text-2xl font-semibold mb-5">A little more about me.</h2>
              <dl className="grid sm:grid-cols-2 gap-6">
                <div>
                  <dt className="cc-subtle">Languages</dt>
                  <dd className="mt-1 text-sm">
                    {parseList(profile.languages)
                      .map(
                        (l) =>
                          ({
                            EN: 'English',
                            UR: 'Urdu',
                            PN: 'Punjabi',
                            SD: 'Sindhi',
                            PS: 'Pashto',
                            BL: 'Balochi',
                            SK: 'Saraiki',
                          })[l] || l,
                      )
                      .join(', ') || 'Not added yet'}
                  </dd>
                </div>
                <div>
                  <dt className="cc-subtle">Member since</dt>
                  <dd className="mt-1 text-sm">
                    {profile.createdAt.toLocaleDateString('en-GB', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>
              {profile.brandCollabs.length > 0 && (
                <div className="mt-6">
                  <h3 className="cc-subtle mb-3">Previous collaborations</h3>
                  <div className="flex gap-2 flex-wrap">
                    {profile.brandCollabs.map((c) => (
                      <span
                        className="border border-anjuman-line bg-white rounded px-3 py-2 text-sm"
                        key={c.id}
                      >
                        {c.brandName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
          <aside>
            <div className="cc-panel p-6 lg:sticky lg:top-24">
              <p className="cc-eyebrow mb-3">Let&apos;s make something good</p>
              <h2 className="text-2xl font-semibold mb-2">
                Work with {user.name?.split(' ')[0] || 'this creator'}.
              </h2>
              <p className="cc-subtle mb-6">A starting point for your next collaboration.</p>
              <div className="border-y border-anjuman-line py-2 mb-5">
                {rates.length ? (
                  rates.map((r) => (
                    <div key={r.label} className="flex justify-between gap-3 text-sm py-3">
                      <span className="text-anjuman-ink-soft">{r.label}</span>
                      <strong className="font-semibold">{formatPKR(r.price)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="cc-subtle py-3">
                    Rates haven&apos;t been listed. Include your budget in a campaign brief.
                  </p>
                )}
              </div>
              <p className="text-xs leading-relaxed text-anjuman-ink-soft mb-5">
                Rates are set by the creator. Final scope and pricing are agreed for each project.
              </p>
              <Link href={action} className="cc-button w-full">
                {owner ? 'Edit your profile' : 'Post a campaign'}
                <ArrowUpRight size={17} />
              </Link>
              <p className="cc-subtle text-center text-xs mt-4">
                {owner
                  ? 'Keep your work and services up to date.'
                  : 'Share a brief and review creator proposals.'}
              </p>
            </div>
          </aside>
        </div>
        <div className="fixed bottom-0 inset-x-0 p-3 border-t border-anjuman-line bg-white lg:hidden z-30 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            {rates.length
              ? 'From ' + formatPKR(Math.min(...rates.map((r) => r.price)))
              : 'Let’s collaborate'}
          </span>
          <Link className="cc-button" href={action}>
            {owner ? 'Edit profile' : 'Post a campaign'}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
