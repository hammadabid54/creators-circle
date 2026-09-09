import { Prisma } from '@prisma/client';
import type { DiscoveryFilters } from './discovery-taxonomy';

export const RANKING_VERSION = 'recommended-v1';
// Product policy, not a measure of artistic quality. Keep capped signals and expose reasons.
export function rankingSql(filters: DiscoveryFilters) {
  const freshAfter = Math.floor(Date.now() / 86400000) * 86400 - 30 * 86400;
  const now = Math.floor(Date.now() / 1000);
  const platform = filters.platform ? Prisma.sql`AND s.platform=${filters.platform}` : Prisma.empty;
  const words = (filters.q || '').trim().split(/\s+/).filter(Boolean).slice(0, 12);
  const matches = words.map((word) => {
    const pattern = '%' + word.replace(/[!%_]/g, (c) => '!' + c) + '%';
    return Prisma.sql`(CASE WHEN u.name LIKE ${pattern} ESCAPE '!' THEN 2 ELSE 0 END + CASE WHEN EXISTS(SELECT 1 FROM SocialAccount x WHERE x.creatorId=p.id AND x.handle LIKE ${pattern} ESCAPE '!') THEN 2 ELSE 0 END)`;
  });
  const relevance = matches.length ? Prisma.sql`(${Prisma.join(matches, ' + ')})` : Prisma.sql`0`;
  const cte = Prisma.sql`WITH fresh_accounts AS (
    SELECT s.* FROM SocialAccount s
    WHERE s.connectionState='connected' AND s.lastSyncedAt IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM SocialAccount demo WHERE demo.creatorId=s.creatorId AND demo.connectionState='dev_mock')
    AND (CASE WHEN typeof(s.lastSyncedAt) IN ('integer','real') THEN s.lastSyncedAt/1000 ELSE unixepoch(s.lastSyncedAt) END) BETWEEN ${freshAfter} AND ${now}
  ), engagement_peers AS (
    SELECT id,platform,(percent_rank() OVER(PARTITION BY platform ORDER BY engagementRate) + cume_dist() OVER(PARTITION BY platform ORDER BY engagementRate))/2 percentile,
      count(*) OVER(PARTITION BY platform) peers
    FROM fresh_accounts WHERE engagementRate BETWEEN 0 AND 100 AND followers>=1000
  ), social_quality AS (
    SELECT s.creatorId,1 fresh,avg(CASE WHEN e.peers>=20 THEN e.percentile END) engagement
    FROM fresh_accounts s LEFT JOIN engagement_peers e ON e.id=s.id WHERE 1=1 ${platform} GROUP BY s.creatorId
  ), completed_brands AS (
    SELECT c.creatorId,count(DISTINCT c.brandId) brands FROM Contract c
    WHERE c.status='completed' AND c.creatorId!=c.brandId
      AND EXISTS(SELECT 1 FROM Milestone m WHERE m.contractId=c.id)
      AND NOT EXISTS(SELECT 1 FROM Milestone m WHERE m.contractId=c.id AND m.status!='approved')
      AND EXISTS(SELECT 1 FROM ContentSubmission s JOIN DeliveryReview r ON r.submissionId=s.id
        WHERE s.contractId=c.id AND s.status='approved' AND r.action='approve' AND r.reviewerId=c.brandId)
    GROUP BY c.creatorId
  ), profile_signals AS (
    SELECT p.id creatorId,
      CASE WHEN length(trim(COALESCE(p.bio,'')))>=80 THEN 10 WHEN length(trim(COALESCE(p.bio,'')))>=40 THEN 5 ELSE 0 END
      + 5*min(3,(SELECT count(*) FROM PortfolioItem x WHERE x.creatorId=p.id AND (x.url LIKE 'https://%' OR x.url LIKE 'http://%')))
      + CASE WHEN EXISTS(SELECT 1 FROM RateCard r WHERE r.creatorId=p.id AND (r.postRate IS NOT NULL OR r.storyRate IS NOT NULL OR r.reelRate IS NOT NULL OR r.youtubeLongRate IS NOT NULL OR r.youtubeShortRate IS NOT NULL)) THEN 10 ELSE 0 END
      + CASE WHEN length(trim(COALESCE(p.city,'')))>0 AND EXISTS(SELECT 1 FROM CreatorTaxon t JOIN DiscoveryTaxon d ON d.id=t.taxonId WHERE t.creatorId=p.id AND d.kind='niche' AND d.enabled=1) THEN 5 ELSE 0 END
      + CASE WHEN EXISTS(SELECT 1 FROM CreatorTaxon t JOIN DiscoveryTaxon d ON d.id=t.taxonId WHERE t.creatorId=p.id AND d.kind='language' AND d.enabled=1) THEN 5 ELSE 0 END
      + CASE WHEN u.image LIKE 'https://%' OR u.image LIKE 'http://%' THEN 5 ELSE 0 END readiness,
      COALESCE(q.fresh,0) fresh,COALESCE(q.engagement,0.5) engagement,
      COALESCE(c.brands,0) brands,p.available,
      EXISTS(SELECT 1 FROM SocialAccount s WHERE s.creatorId=p.id AND s.connectionState='dev_mock') demo,
      ${relevance} relevance
    FROM CreatorProfile p JOIN User u ON u.id=p.userId
    LEFT JOIN social_quality q ON q.creatorId=p.id LEFT JOIN completed_brands c ON c.creatorId=p.userId
  ), creator_rank AS (
    SELECT *,readiness + 15*available + 10*fresh + 5*engagement + 8 + 12.0*min(brands,5)/5 score
    FROM profile_signals
  )`;
  return { cte, order: Prisma.sql`cr.demo ASC,cr.relevance DESC,cr.score DESC` };
}

export type RankSignals = {
  readiness: number;
  fresh: number;
  engagement: number;
  brands: number;
  available: number;
  demo: number;
  relevance: number;
  score: number;
};
export function rankingReasons(r: RankSignals): string[] {
  if (Number(r.demo)) return ['Demo profile - excluded from live recommendation priority'];
  const reasons: string[] = [];
  if (r.relevance > 0) reasons.push('Search terms match name or handle');
  if (r.readiness >= 35) reasons.push('Detailed profile and work information');
  if (Number(r.available)) reasons.push('Open to collaborations');
  if (r.brands > 0)
    reasons.push(`Approved work with ${r.brands} ${Number(r.brands) === 1 ? 'brand' : 'brands'}`);
  if (Number(r.fresh)) reasons.push('Connected statistics refreshed within 30 days');
  if (r.engagement >= 0.75) reasons.push('Strong engagement among measured platform peers');
  return reasons.length ? reasons : ['Matches your filters; limited supporting information'];
}
