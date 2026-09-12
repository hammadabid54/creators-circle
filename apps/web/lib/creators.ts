import { db } from '@/lib/db';
import type { CreatorCardData } from '@/components/creator/creator-card';
export function parseList(value: string | null | undefined): string[] {
  try {
    const result: unknown = JSON.parse(value || '[]');
    return Array.isArray(result) ? result.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}
export async function getPublicCreators(
  options: { ids?: string[]; take?: number } = {},
): Promise<CreatorCardData[]> {
  const profiles = await db.creatorProfile.findMany({
    where: {
      socialAccounts: { some: {} },
      ...(options.ids ? { userId: { in: options.ids } } : {}),
    },
    take: options.take ?? 24,
    select: {
      userId: true,
      slug: true,
      bio: true,
      city: true,
      niches: true,
      languages: true,
      verified: true,
      available: true,
      createdAt: true,
      user: { select: { name: true, image: true } },
      rateCard: true,
      portfolio: {
        select: { id: true, type: true, url: true, caption: true },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      socialAccounts: {
        select: {
          platform: true,
          handle: true,
          followers: true,
          engagementRate: true,
          connectionState: true,
          lastSyncedAt: true,
        },
      },
      _count: { select: { brandCollabs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return profiles.map((p) => {
    const rates = [
      { rate: p.rateCard?.postRate, unit: 'post' },
      { rate: p.rateCard?.storyRate, unit: 'story' },
      { rate: p.rateCard?.reelRate, unit: 'reel' },
      { rate: p.rateCard?.youtubeLongRate, unit: 'video' },
      { rate: p.rateCard?.youtubeShortRate, unit: 'short' },
    ]
      .filter((r): r is { rate: number; unit: string } => typeof r.rate === 'number')
      .sort((a, b) => a.rate - b.rate);
    const measured = p.socialAccounts.filter((s) => s.engagementRate !== null);
    const demo = p.socialAccounts.some((s) => s.connectionState === 'dev_mock');
    return {
      id: p.userId,
      slug: p.slug,
      name: p.user.name || 'Creator',
      handle: p.socialAccounts[0]?.handle || '',
      city: p.city || 'Pakistan',
      bio: p.bio || '',
      image: p.user.image || undefined,
      cover: p.portfolio[0]?.type === 'image' ? p.portfolio[0].url : undefined,
      coverCaption: p.portfolio[0]?.caption || '',
      niches: parseList(p.niches),
      languages: parseList(p.languages),
      platforms: p.socialAccounts.map((s) => ({
        platform: s.platform as CreatorCardData['platforms'][number]['platform'],
        followers: s.followers,
      })),
      engagementRate: measured.length
        ? Number(
            (measured.reduce((n, s) => n + (s.engagementRate || 0), 0) / measured.length).toFixed(
              1,
            ),
          )
        : null,
      pastCollabs: p._count.brandCollabs,
      startingRate: rates[0]?.rate ?? null,
      rateUnit: rates[0]?.unit || 'project',
      verified: p.verified,
      available: p.available,
      demo,
      createdAt: p.createdAt.toISOString(),
      provenance: demo ? 'Demo metrics' : 'Profile statistics',
      lastSyncedAt:
        p.socialAccounts
          .map((s) => s.lastSyncedAt?.toISOString())
          .filter((s): s is string => !!s)
          .sort()
          .reverse()[0] || null,
    };
  });
}
