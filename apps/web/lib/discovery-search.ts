import { rankingSql, rankingReasons, type RankSignals } from './creator-ranking';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getPublicCreators } from '@/lib/creators';
import { getTaxonomy, resolveTaxon, type DiscoveryFilters } from './discovery-taxonomy';
export const PAGE_SIZE = 24;
export const MIN_INDEXABLE_CREATORS = 6; // Editorial policy, not a search-engine requirement.
const ranges: Record<string, [number, number]> = {
  '0-10K': [0, 10000],
  '10K-100K': [10000, 100000],
  '100K-500K': [100000, 500000],
  '500K-1M': [500000, 1000000],
  '1M+': [1000000, 2147483648],
};
export async function searchCreators(filters: DiscoveryFilters, publicOnly = false) {
  const dimensions = new Map<string, Prisma.Sql>();
  const taxa = await getTaxonomy();
  const where: Prisma.Sql[] = [
    Prisma.sql`EXISTS(SELECT 1 FROM SocialAccount s WHERE s.creatorId=p.id)`,
  ];
  if (publicOnly)
    where.push(
      Prisma.sql`length(trim(COALESCE(u.name,'')))>1 AND length(trim(COALESCE(p.bio,'')))>=40 AND NOT EXISTS(SELECT 1 FROM SocialAccount s WHERE s.creatorId=p.id AND s.connectionState='dev_mock')`,
    );
  for (const kind of ['niche', 'city', 'language'] as const) {
    const value = filters[kind];
    if (!value) continue;
    const taxon = resolveTaxon(taxa, kind, value);
    if (!taxon) {
      where.push(Prisma.sql`0=1`);
      continue;
    }
    const ids = [taxon.id];
    for (let i = 0; i < ids.length; i++)
      for (const child of taxa.filter((t) => t.parentId === ids[i]))
        if (!ids.includes(child.id)) ids.push(child.id);
    const clause = Prisma.sql`EXISTS(SELECT 1 FROM CreatorTaxon ct WHERE ct.creatorId=p.id AND ct.taxonId IN (${Prisma.join(ids)}))`;
    where.push(clause);
    dimensions.set(kind, clause);
  }
  if (filters.platform)
    where.push(
      Prisma.sql`EXISTS(SELECT 1 FROM SocialAccount s WHERE s.creatorId=p.id AND s.platform=${filters.platform})`,
    );
  if (filters.available) where.push(Prisma.sql`p.available=1`);
  if (filters.q)
    for (const word of filters.q.trim().split(/\s+/).slice(0, 12)) {
      const pattern = '%' + word.replace(/[!%_]/g, (c) => '!' + c) + '%';
      where.push(
        Prisma.sql`(u.name LIKE ${pattern} ESCAPE '!' OR p.bio LIKE ${pattern} ESCAPE '!' OR EXISTS(SELECT 1 FROM SocialAccount s WHERE s.creatorId=p.id AND s.handle LIKE ${pattern} ESCAPE '!'))`,
      );
    }
  if (filters.saved) {
    const ids = (filters.ids || '').split(',').filter(Boolean).slice(0, 200);
    where.push(ids.length ? Prisma.sql`p.userId IN (${Prisma.join(ids)})` : Prisma.sql`0=1`);
  }
  const column = {
    post: 'postRate',
    story: 'storyRate',
    reel: 'reelRate',
    youtube_long: 'youtubeLongRate',
    youtube_short: 'youtubeShortRate',
  };
  const price = filters.format
    ? Prisma.sql`r.${Prisma.raw(column[filters.format])}`
    : Prisma.sql`NULLIF(min(COALESCE(r.postRate,2147483648),COALESCE(r.storyRate,2147483648),COALESCE(r.reelRate,2147483648),COALESCE(r.youtubeLongRate,2147483648),COALESCE(r.youtubeShortRate,2147483648)),2147483648)`;
  const audience = Prisma.sql`(SELECT sum(s.followers) FROM SocialAccount s WHERE s.creatorId=p.id ${filters.platform ? Prisma.sql`AND s.platform=${filters.platform}` : Prisma.empty})`;
  const engagement = Prisma.sql`(SELECT avg(s.engagementRate) FROM SocialAccount s WHERE s.creatorId=p.id ${filters.platform ? Prisma.sql`AND s.platform=${filters.platform}` : Prisma.empty})`;
  if (filters.rate !== undefined) where.push(Prisma.sql`${price} <= ${filters.rate}`);
  if (filters.format) where.push(Prisma.sql`${price} IS NOT NULL`);
  const range = filters.followers && ranges[filters.followers];
  if (range) where.push(Prisma.sql`${audience} >= ${range[0]} AND ${audience} < ${range[1]}`);
  const base = Prisma.sql`FROM CreatorProfile p JOIN User u ON u.id=p.userId LEFT JOIN RateCard r ON r.creatorId=p.id WHERE ${Prisma.join(where, ' AND ')}`;
  const recommended = filters.sort === 'recommended';
  const ranking = rankingSql(filters);
  const order = recommended
    ? ranking.order
    : filters.sort === 'rate'
      ? Prisma.sql`${price} IS NULL ASC,${price} ASC`
      : filters.sort === 'followers'
        ? Prisma.sql`${audience} DESC`
        : filters.sort === 'engagement'
          ? Prisma.sql`${engagement} IS NULL ASC,${engagement} DESC`
          : Prisma.sql`p.createdAt DESC`;
  const counts = await db.$queryRaw<Array<{ total: bigint }>>(
    Prisma.sql`SELECT count(*) total ${base}`,
  );
  const total = Number(counts[0]?.total || 0);
  const rankedBase = Prisma.sql`FROM CreatorProfile p JOIN User u ON u.id=p.userId LEFT JOIN RateCard r ON r.creatorId=p.id JOIN creator_rank cr ON cr.creatorId=p.id WHERE ${Prisma.join(where, ' AND ')}`;
  const rows = await db.$queryRaw<
    Array<{ userId: string; matchedRate: number | null } & RankSignals>
  >(
    Prisma.sql`${recommended ? ranking.cte : Prisma.empty} SELECT p.userId,${price} matchedRate ${recommended ? Prisma.sql`,cr.*` : Prisma.empty} ${recommended ? rankedBase : base} ORDER BY ${order},p.userId ASC LIMIT ${PAGE_SIZE} OFFSET ${(filters.page - 1) * PAGE_SIZE}`,
  );
  const facets: Record<string, number> = {};
  if (!publicOnly)
    for (const kind of ['niche', 'city', 'language']) {
      const clauses = where.filter((w) => w !== dimensions.get(kind));
      const groups = await db.$queryRaw<Array<{ id: string; total: bigint }>>(
        Prisma.sql`WITH RECURSIVE lineage(taxonId,ancestorId) AS (SELECT id,id FROM DiscoveryTaxon UNION ALL SELECT l.taxonId,t.parentId FROM lineage l JOIN DiscoveryTaxon t ON t.id=l.ancestorId WHERE t.parentId IS NOT NULL) SELECT l.ancestorId id,count(DISTINCT p.id) total FROM CreatorProfile p JOIN User u ON u.id=p.userId LEFT JOIN RateCard r ON r.creatorId=p.id JOIN CreatorTaxon ct ON ct.creatorId=p.id JOIN lineage l ON l.taxonId=ct.taxonId JOIN DiscoveryTaxon t ON t.id=l.ancestorId WHERE t.kind=${kind} AND ${Prisma.join(clauses, ' AND ')} GROUP BY l.ancestorId`,
      );
      for (const group of groups) facets[group.id] = Number(group.total);
    }
  const cards = rows.length
    ? await getPublicCreators({ ids: rows.map((r) => r.userId), take: PAGE_SIZE })
    : [];
  return {
    creators: rows.flatMap((r) =>
      cards
        .filter((c) => c.id === r.userId)
        .map((c) => (recommended ? { ...c, rankingReasons: rankingReasons(r) } : c))
        .map((c) =>
          filters.format
            ? {
                ...c,
                startingRate: r.matchedRate,
                rateUnit: {
                  post: 'post',
                  story: 'story',
                  reel: 'reel',
                  youtube_long: 'video',
                  youtube_short: 'short',
                }[filters.format],
              }
            : c,
        ),
    ),
    total,
    page: filters.page,
    pages: Math.ceil(total / PAGE_SIZE),
    taxa,
    facets,
  };
}
