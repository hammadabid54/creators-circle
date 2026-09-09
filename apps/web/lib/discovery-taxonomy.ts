import { db } from '@/lib/db';
import { z } from 'zod';
export type Taxon = {
  id: string;
  kind: 'niche' | 'city' | 'language' | 'format';
  slug: string;
  label: string;
  value: string;
  parentId: string | null;
  aliases: string;
  enabled: number;
};
export async function getTaxonomy() {
  return db.$queryRaw<Taxon[]>`SELECT * FROM DiscoveryTaxon WHERE enabled=1 ORDER BY kind,label`;
}
export const filterSchema = z.object({
  q: z.string().max(160).optional(),
  niche: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  language: z.string().max(30).optional(),
  platform: z.enum(['instagram', 'youtube', 'tiktok', 'facebook']).optional(),
  format: z.enum(['post', 'story', 'reel', 'youtube_long', 'youtube_short']).optional(),
  rate: z.coerce.number().int().min(0).max(2147483647).optional(),
  followers: z.enum(['0-10K', '10K-100K', '100K-500K', '500K-1M', '1M+']).optional(),
  available: z.enum(['1']).optional(),
  sort: z.enum(['recommended', 'newest', 'rate', 'followers', 'engagement']).default('recommended'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  saved: z.enum(['1']).optional(),
  ids: z.string().max(10000).optional(),
});
export type DiscoveryFilters = z.infer<typeof filterSchema>;
export type LandingPage = {
  path: string;
  title: string;
  description: string;
  intro: string;
  filters: string;
  published: number;
  indexable: number;
  redirectTo: string | null;
  updatedAt: string;
};
export async function getLandingPages() {
  return db.$queryRaw<LandingPage[]>`SELECT * FROM DiscoveryPage WHERE published=1 ORDER BY title`;
}
export async function getLandingPage(path: string) {
  return (
    await db.$queryRaw<
      LandingPage[]
    >`SELECT * FROM DiscoveryPage WHERE path=${path} AND published=1`
  )[0];
}
export function parseFilters(input: Record<string, string | string[] | undefined>) {
  const clean = Object.fromEntries(
    Object.entries(input).filter(([, v]) => typeof v === 'string' && v !== ''),
  );
  return filterSchema.safeParse(clean);
}
export function resolveTaxon(taxa: Taxon[], kind: string, value: string) {
  const text = value.toLowerCase().trim();
  return taxa.find(
    (t) =>
      t.kind === kind &&
      [t.value, t.label, t.slug, ...JSON.parse(t.aliases)].some(
        (v: string) => v.toLowerCase() === text,
      ),
  );
}
// Conservative interpretation; never infer audience demographics or protected traits.
export function interpretQuery(q: string, taxa: Taxon[]) {
  let remaining = q.toLowerCase().replace(/-/g, ' ');
  const result: Record<string, string> = {};
  let clarification = '';
  const audience = /\baudience\b/.test(remaining);
  if (audience)
    clarification =
      'Location filters refer to where creators are based. Audience-location search requires measured audience data and is not available yet.';
  const match = (terms: string[]) =>
    terms
      .sort((a, b) => b.length - a.length)
      .find((term) =>
        new RegExp(
          '(^|[^a-z0-9])' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^a-z0-9])',
          'i',
        ).test(remaining),
      );
  const ranked = [...taxa].sort(
    (a, b) =>
      Number(Boolean(b.parentId)) - Number(Boolean(a.parentId)) || b.label.length - a.label.length,
  );
  for (const t of ranked) {
    if (result[t.kind] || (audience && t.kind === 'city')) continue;
    const term = match([t.label.toLowerCase(), t.slug, ...JSON.parse(t.aliases)]);
    if (term) {
      result[t.kind] = t.value;
      remaining = remaining.replace(term, ' ');
    }
  }
  for (const p of ['instagram', 'youtube', 'tiktok', 'facebook'])
    if (match([p])) {
      result.platform = p;
      remaining = remaining.replace(p, ' ');
      break;
    }
  const budget = remaining.match(
    /(?:under|below|up to|less than)\s*(?:pkr|rs\.?|rupees)?\s*([\d,]+)(k)?/i,
  );
  if (budget) {
    const amount = Number(budget[1]!.replaceAll(',', '')) * (budget[2] ? 1000 : 1);
    if (amount <= 2147483647) {
      result.rate = String(amount);
      remaining = remaining.replace(budget[0], ' ');
    }
  }
  remaining = remaining
    .replace(
      /\b(find|show|me|in|from|based|who|with|and|or|for|the|a|an|pakistan|pakistani|creator|creators|influencer|influencers|blogger|bloggers|speaking|speak|on|please)\b/g,
      ' ',
    )
    .replace(/[.,;:!?-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (result.format?.startsWith('youtube_') && !result.platform) result.platform = 'youtube';
  if (remaining) result.q = remaining;
  return { filters: result, clarification };
}

export function suggestTaxa(query: string, taxa: Taxon[]) {
  const q = query.toLowerCase().trim();
  if (q.length < 3 || q.length > 50) return [];
  function distance(a: string, b: string) {
    let row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const next = [i];
      for (let j = 1; j <= b.length; j++)
        next[j] = Math.min(
          next[j - 1]! + 1,
          row[j]! + 1,
          row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      row = next;
    }
    return row[b.length]!;
  }
  return taxa
    .filter((t) => ['niche', 'city'].includes(t.kind))
    .map((t) => ({
      t,
      d: Math.min(
        ...[t.label, t.slug, ...JSON.parse(t.aliases)].map((v: string) =>
          distance(q, v.toLowerCase()),
        ),
      ),
    }))
    .filter((x) => x.d > 0 && x.d <= (q.length < 5 ? 1 : 2))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((x) => x.t);
}
