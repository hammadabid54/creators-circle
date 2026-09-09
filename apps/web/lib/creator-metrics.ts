import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
const distribution = z
  .array(z.object({ label: z.string().min(1).max(100), value: z.number().min(0).max(100) }))
  .max(30)
  .refine((rows) => rows.reduce((sum, row) => sum + row.value, 0) <= 100.5);
export const metricSchema = z.object({
  socialAccountId: z.string(),
  observedAt: z.string().datetime(),
  followers: z.number().int().min(0),
  source: z.enum(['provider']),
  posts: z
    .array(
      z.object({
        label: z.string().max(150),
        views: z.number().int().min(0),
        engagement: z.number().min(0).max(100).nullable(),
      }),
    )
    .max(20)
    .default([]),
  cities: distribution.default([]),
  ages: distribution.default([]),
});
export type MetricSnapshot = z.infer<typeof metricSchema>;
// Provider adapters call this only after a successful, measured fetch.
export async function recordMetrics(input: MetricSnapshot) {
  const d = metricSchema.parse(input);
  if (+new Date(d.observedAt) > Date.now() + 60000)
    throw new Error('Future observations are invalid');
  await db.$executeRaw`INSERT INTO CreatorMetricSnapshot (id,socialAccountId,observedAt,followers,source,posts,cities,ages) VALUES (${randomUUID()},${d.socialAccountId},${d.observedAt},${d.followers},${d.source},${JSON.stringify(d.posts)},${JSON.stringify(d.cities)},${JSON.stringify(d.ages)}) ON CONFLICT(socialAccountId,observedAt) DO NOTHING`;
}
export async function getMetricHistory(creatorId: string): Promise<MetricSnapshot[]> {
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const rows = await db.$queryRaw<
    Array<{
      socialAccountId: string;
      observedAt: string;
      followers: number;
      source: string;
      posts: string;
      cities: string;
      ages: string;
    }>
  >`SELECT m.* FROM CreatorMetricSnapshot m JOIN SocialAccount s ON s.id=m.socialAccountId WHERE s.creatorId=${creatorId} AND s.connectionState!='dev_mock' AND m.observedAt>=${since} ORDER BY m.observedAt ASC LIMIT 1000`;
  return rows.flatMap((row) => {
    try {
      const parsed = metricSchema.safeParse({
        ...row,
        posts: JSON.parse(row.posts),
        cities: JSON.parse(row.cities),
        ages: JSON.parse(row.ages),
      });
      return parsed.success ? [parsed.data] : [];
    } catch {
      return [];
    }
  });
}
