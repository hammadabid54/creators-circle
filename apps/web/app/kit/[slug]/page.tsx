import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getMetricHistory } from '@/lib/creator-metrics';
import { formatNumber, formatPKR } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await db.creatorProfile.findUnique({
    where: { slug },
    include: { user: { select: { name: true, image: true } } },
  });
  if (!profile) return { title: 'Creator kit · Kollabo' };
  const name = profile.user.name || 'Creator';
  const niches = JSON.parse(profile.niches || '[]') as string[];
  const city = profile.city;
  const summary =
    `${name} on Kollabo. Niches: ${niches.slice(0, 3).join(', ')}.` +
    (city ? ` Based in ${city}.` : '');
  const ogImage = `/api/og/kit/${slug}`;
  return {
    title: `${name} · Creator kit · Kollabo`,
    description: summary,
    openGraph: {
      title: `${name} is on Kollabo`,
      description: summary,
      type: 'profile',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} is on Kollabo`,
      description: summary,
      images: [ogImage],
    },
  };
}

export default async function KitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await db.creatorProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { name: true, image: true } },
      socialAccounts: true,
      rateCard: true,
      brandCollabs: { orderBy: { year: 'desc' as const }, take: 8 },
      audience: true,
    },
  });
  if (!profile) notFound();

  const niches = JSON.parse(profile.niches || '[]') as string[];
  const languages = JSON.parse(profile.languages || '[]') as string[];
  const name = profile.user.name || 'Creator';
  // Roll up followers per connected social platform. The metric history
  // table doesn't carry the platform name; we read it from the connected
  // accounts and match the latest snapshot per account.
  const latestByPlatform = new Map<string, number>();
  for (const sa of profile.socialAccounts) {
    const snaps = await getMetricHistory(profile.id).catch(() => []);
    const matching = snaps.filter((s) => s.socialAccountId === sa.id);
    if (matching.length === 0) {
      // Fall back to the followers column on SocialAccount itself if no
      // snapshot exists yet.
      if (sa.followers > 0) latestByPlatform.set(sa.platform, sa.followers);
      continue;
    }
    matching.sort((a, b) => +new Date(b.observedAt) - +new Date(a.observedAt));
    const latest = matching[0];
    if (latest) latestByPlatform.set(sa.platform, latest.followers);
  }
  const totalFollowers = Array.from(latestByPlatform.values()).reduce(
    (s, m) => s + m,
    0,
  );
  const rates: { label: string; price: number }[] = [];
  if (profile.rateCard?.postRate) rates.push({ label: 'Post', price: profile.rateCard.postRate });
  if (profile.rateCard?.storyRate) rates.push({ label: 'Story', price: profile.rateCard.storyRate });
  if (profile.rateCard?.reelRate) rates.push({ label: 'Reel', price: profile.rateCard.reelRate });
  if (profile.rateCard?.youtubeLongRate) rates.push({ label: 'YouTube long', price: profile.rateCard.youtubeLongRate });
  if (profile.rateCard?.youtubeShortRate) rates.push({ label: 'YouTube short', price: profile.rateCard.youtubeShortRate });

  const shareUrl = `/kit/${slug}`;
  const hireUrl = `/brand/invite?creatorId=${profile.userId}`;

  return (
    <main className="min-h-screen bg-anjuman-canvas">
      {/* OG-friendly preview that doubles as the shareable kit */}
      <section className="cc-container py-10 md:py-16">
        <header className="flex flex-col md:flex-row gap-6 md:items-center">
          <Avatar
            name={name}
            src={profile.user.image ?? undefined}
            size="2xl"
            className="border-2 border-white shadow"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="cc-title text-3xl md:text-4xl">{name}</h1>
              {profile.verified && <BadgeCheck className="text-anjuman-purple" size={20} />}
            </div>
            <p className="cc-subtle mt-2">
              {[profile.city, ...niches].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Link href={hireUrl} className="cc-button self-start md:self-auto">
            Hire on Kollabo <ArrowUpRight size={16} />
          </Link>
        </header>

        {profile.bio && (
          <p className="mt-8 text-base md:text-lg max-w-3xl leading-relaxed">{profile.bio}</p>
        )}

        <div className="mt-10 grid md:grid-cols-3 gap-4">
          <div className="cc-panel p-5">
            <p className="cc-eyebrow">Audience</p>
            <p className="text-2xl font-semibold mt-2">
              {formatNumber(totalFollowers)}
            </p>
            <p className="cc-subtle text-xs mt-1">Total followers across platforms</p>
            {latestByPlatform.size > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {Array.from(latestByPlatform.entries()).map(([p, followers]) => (
                  <li key={p} className="flex justify-between">
                    <span className="capitalize text-anjuman-ink-soft">{p}</span>
                    <span className="font-medium">{formatNumber(followers)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="cc-panel p-5">
            <p className="cc-eyebrow">Niches</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {niches.length > 0 ? (
                niches.map((n) => (
                  <span
                    key={n}
                    className="text-xs bg-[#f2eaf0] text-anjuman-purple rounded-full px-2.5 py-1"
                  >
                    {n}
                  </span>
                ))
              ) : (
                <span className="cc-subtle text-sm">—</span>
              )}
            </div>
            <p className="cc-eyebrow mt-5">Languages</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {languages.length > 0 ? (
                languages.map((l) => (
                  <span
                    key={l}
                    className="text-xs border border-anjuman-line rounded-full px-2.5 py-1"
                  >
                    {l}
                  </span>
                ))
              ) : (
                <span className="cc-subtle text-sm">—</span>
              )}
            </div>
          </div>
          <div className="cc-panel p-5">
            <p className="cc-eyebrow">Rates</p>
            {rates.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-sm">
                {rates.map((r) => (
                  <li key={r.label} className="flex justify-between">
                    <span className="text-anjuman-ink-soft">{r.label}</span>
                    <span className="font-semibold">{formatPKR(r.price)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cc-subtle text-sm mt-2">
                Custom quotes on request.
              </p>
            )}
          </div>
        </div>

        {profile.brandCollabs.length > 0 && (
          <section className="mt-10">
            <p className="cc-eyebrow mb-3">Previous collaborations</p>
            <div className="flex flex-wrap gap-2">
              {profile.brandCollabs.map((c) => (
                <span
                  key={c.id}
                  className="border border-anjuman-line bg-white rounded px-3 py-2 text-sm"
                >
                  {c.brandName}
                  {c.year ? ` · ${c.year}` : ''}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 cc-panel p-8 text-center">
          <h2 className="text-2xl font-semibold mb-2">
            Want to work with {name}?
          </h2>
          <p className="cc-subtle mb-5 max-w-xl mx-auto">
            Hire directly through Kollabo. Funds held in escrow, work
            tracked milestone by milestone, payment released on your
            approval.
          </p>
          <Link href={hireUrl} className="cc-button">
            Invite {name.split(' ')[0]} to a campaign <ArrowUpRight size={16} />
          </Link>
          <p className="cc-subtle text-xs mt-5">
            Sharing link:{' '}
            <code className="bg-[#f2eaf0] text-anjuman-purple rounded px-1.5 py-0.5 text-[0.85em]">
              {shareUrl}
            </code>
          </p>
        </section>
      </section>
    </main>
  );
}
