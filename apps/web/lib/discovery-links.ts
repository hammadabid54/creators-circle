import { filterSchema, resolveTaxon, type LandingPage, type Taxon } from './discovery-taxonomy';
export type DiscoveryLink = { label: string; href: string };
type Filters = Record<string, string>;
const dimensions = ['niche', 'city', 'platform', 'language', 'format', 'rate', 'available'];
export function landingFilters(page: LandingPage, taxa: Taxon[]): Filters | null {
  try {
    const raw = JSON.parse(page.filters);
    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      Object.keys(raw).some((k) => !dimensions.includes(k))
    )
      return null;
    const parsed = filterSchema.safeParse(raw);
    if (!parsed.success) return null;
    const values: Filters = {};
    for (const k of dimensions)
      if (raw[k] !== undefined && raw[k] !== '') values[k] = String(raw[k]);
    for (const k of ['niche', 'city', 'language'])
      if (values[k]) {
        const t = resolveTaxon(taxa, k, values[k]!);
        if (!t) return null;
        values[k] = t.value;
      }
    return values;
  } catch {
    return null;
  }
}
const identity = (filters: Filters) =>
  JSON.stringify(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)));
export function publishedCollections(pages: LandingPage[], taxa: Taxon[]) {
  return pages
    .filter(
      (p) =>
        p.published &&
        !p.redirectTo &&
        /^[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}$/.test(p.path) &&
        !['niches', 'cities', 'platforms'].includes(p.path),
    )
    .map((page) => ({ page, filters: landingFilters(page, taxa) }))
    .filter((x): x is { page: LandingPage; filters: Filters } => x.filters !== null)
    .sort((a, b) => a.page.path.localeCompare(b.page.path));
}
export function discoveryHierarchy(page: LandingPage, pages: LandingPage[], taxa: Taxon[]) {
  const collections = publishedCollections(pages, taxa);
  const filters = landingFilters(page, taxa) || {};
  const href = '/discover/' + page.path;
  const find = (f: Filters) => collections.find((p) => identity(p.filters) === identity(f))?.page;
  const link = (f: Filters, label: string): DiscoveryLink | null => {
    const destination = find(f);
    return destination ? { label, href: '/discover/' + destination.path } : null;
  };
  const breadcrumbs: DiscoveryLink[] = [
    { label: 'Home', href: '/' },
    { label: 'Discover', href: '/discover' },
  ];
  const niche = filters.niche ? resolveTaxon(taxa, 'niche', filters.niche) : undefined;
  const city = filters.city ? resolveTaxon(taxa, 'city', filters.city) : undefined;
  const parents: Taxon[] = [];
  let cursor = niche;
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    parents.unshift(cursor);
    cursor = taxa.find((t) => t.id === cursor?.parentId && t.kind === 'niche');
  }
  if (niche) {
    breadcrumbs.push({ label: 'Niches', href: '/discover/niches' });
    for (const t of parents) {
      const parent = find({ niche: t.value });
      if (parent && parent.path !== page.path)
        breadcrumbs.push({ label: t.label, href: '/discover/' + parent.path });
    }
    if (city) {
      const combination = find({ niche: niche.value, city: city.value });
      if (combination && combination.path !== page.path)
        breadcrumbs.push({
          label: `${niche.label} in ${city.label}`,
          href: '/discover/' + combination.path,
        });
    }
  } else if (city) {
    breadcrumbs.push({ label: 'Cities', href: '/discover/cities' });
    const parent = find({ city: city.value });
    if (parent && parent.path !== page.path)
      breadcrumbs.push({ label: city.label, href: '/discover/' + parent.path });
  } else if (filters.platform) {
    breadcrumbs.push({ label: 'Platforms', href: '/discover/platforms' });
    const parent = find({ platform: filters.platform });
    if (parent && parent.path !== page.path)
      breadcrumbs.push({ label: parent.title, href: '/discover/' + parent.path });
  }
  breadcrumbs.push({ label: page.title, href });
  const groups: Array<{ title: string; links: DiscoveryLink[] }> = [];
  const add = (title: string, links: Array<DiscoveryLink | null>) => {
    const seen = new Set<string>();
    const clean = links.filter(
      (l): l is DiscoveryLink => !!l && l.href !== href && !seen.has(l.href) && !!seen.add(l.href),
    );
    if (clean.length) groups.push({ title, links: clean.slice(0, 12) });
  };
  if (Object.keys(filters).length > 1)
    add('Explore the broader categories', [
      ...(niche ? [link({ niche: niche.value }, `All ${niche.label.toLowerCase()} creators`)] : []),
      ...(city ? [link({ city: city.value }, `All creators in ${city.label}`)] : []),
    ]);
  if (niche) {
    add(
      `Specialities in ${niche.label}`,
      taxa
        .filter((t) => t.kind === 'niche' && t.parentId === niche.id)
        .map((t) =>
          link({ ...filters, niche: t.value }, city ? `${t.label} in ${city.label}` : t.label),
        ),
    );
    add(
      `${niche.label} creators by city`,
      taxa
        .filter((t) => t.kind === 'city' && t.value !== 'Other' && t.value !== city?.value)
        .map((t) => link({ ...filters, city: t.value }, `${niche.label} creators in ${t.label}`)),
    );
    add(
      'Related niches',
      taxa
        .filter((t) => t.kind === 'niche' && t.parentId === niche.parentId && t.id !== niche.id)
        .map((t) =>
          link({ ...filters, niche: t.value }, city ? `${t.label} in ${city.label}` : t.label),
        ),
    );
  }
  if (city && !niche)
    add(
      `Explore niches in ${city.label}`,
      taxa
        .filter((t) => t.kind === 'niche' && !t.parentId)
        .map((t) => link({ ...filters, niche: t.value }, `${t.label} creators in ${city.label}`)),
    );
  if (city)
    add(
      'Explore other cities',
      collections
        .filter(
          (x) =>
            Object.keys(x.filters).length === 1 && x.filters.city && x.filters.city !== city.value,
        )
        .map((x) => ({ label: x.page.title, href: '/discover/' + x.page.path })),
    );
  return { breadcrumbs, groups };
}
