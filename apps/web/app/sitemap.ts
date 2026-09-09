import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { publicSiteUrl } from '@/lib/site-url';
import { getLandingPages, filterSchema } from '@/lib/discovery-taxonomy';
import { searchCreators, MIN_INDEXABLE_CREATORS } from '@/lib/discovery-search';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = publicSiteUrl();
  if (!site) return [];
  const pages = (await getLandingPages()).filter((p) => p.indexable && !p.redirectTo);
  const entries: MetadataRoute.Sitemap = [
    { url: site },
    { url: site + '/discover' },
    { url: site + '/discover/niches' },
    { url: site + '/discover/cities' },
    { url: site + '/discover/platforms' },
    { url: site + '/creators' },
  ];
  for (const p of pages) {
    const filters = filterSchema.safeParse(JSON.parse(p.filters));
    if (!filters.success) continue;
    const result = await searchCreators(filters.data, true);
    if (result.total >= MIN_INDEXABLE_CREATORS)
      entries.push({ url: site + '/discover/' + p.path, lastModified: new Date(p.updatedAt) });
  }
  const profiles = await db.creatorProfile.findMany({
    where: {
      bio: { not: null },
      user: { name: { not: null } },
      socialAccounts: { some: {}, none: { connectionState: 'dev_mock' } },
    },
    select: { userId: true, bio: true, updatedAt: true, user: { select: { name: true } } },
    take: 40000,
    orderBy: { userId: 'asc' },
  });
  for (const p of profiles)
    if ((p.bio?.trim().length || 0) >= 40 && (p.user.name?.trim().length || 0) > 1)
      entries.push({ url: site + '/creators/' + p.userId, lastModified: p.updatedAt });
  return entries;
}
