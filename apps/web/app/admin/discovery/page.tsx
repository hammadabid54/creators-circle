import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import {
  filterSchema,
  getTaxonomy,
  type LandingPage,
  resolveTaxon,
} from '@/lib/discovery-taxonomy';
import { searchCreators, MIN_INDEXABLE_CREATORS } from '@/lib/discovery-search';
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin/discovery');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'admin') notFound();
}
const pathSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){0,2}$/)
  .max(180)
  .refine(
    (path) => !['niches', 'cities', 'platforms'].includes(path),
    'This path is reserved for a discovery directory.',
  );
const pageSchema = z.object({
  path: pathSchema,
  title: z.string().trim().min(8).max(100),
  description: z.string().trim().min(30).max(240),
  intro: z.string().trim().min(60).max(5000),
  filters: z.string().max(1500),
  redirectTo: pathSchema.or(z.literal('')),
  published: z.boolean(),
  indexable: z.boolean(),
});
const landingFilters = filterSchema
  .pick({
    niche: true,
    city: true,
    language: true,
    platform: true,
    format: true,
    rate: true,
    available: true,
  })
  .strict();
async function savePage(form: FormData) {
  'use server';
  await requireAdmin();
  let message = 'Page saved.';
  try {
    const selections = Object.fromEntries(
      ['niche', 'city', 'language', 'platform', 'format', 'rate', 'available']
        .map((k) => [k, form.get('filter.' + k)])
        .filter(([, v]) => typeof v === 'string' && v !== ''),
    );
    const d = pageSchema.parse({
      ...Object.fromEntries(form),
      filters: JSON.stringify(selections),
      published: form.get('published') === 'on',
      indexable: form.get('indexable') === 'on',
    });
    const parsed = landingFilters.parse(JSON.parse(d.filters));
    const taxa = await getTaxonomy();
    for (const k of ['niche', 'city', 'language'] as const)
      if (parsed[k]) {
        const t = resolveTaxon(taxa, k, parsed[k]!);
        if (!t) throw new Error('Unknown ' + k);
        parsed[k] = t.value;
      }
    const encoded = JSON.stringify(
      Object.fromEntries(Object.entries(parsed).sort(([a], [b]) => a.localeCompare(b))),
    );
    const duplicate = await db.$queryRaw<
      Array<{ path: string }>
    >`SELECT path FROM DiscoveryPage WHERE filters=${encoded} AND path!=${d.path} AND redirectTo IS NULL`;
    if (duplicate.length && !d.redirectTo)
      throw new Error(
        'These filters already have a page at ' + duplicate[0]!.path + '. Use a redirect instead.',
      );
    if (d.redirectTo) {
      const target = await db.$queryRaw<
        Array<{ redirectTo: string | null }>
      >`SELECT redirectTo FROM DiscoveryPage WHERE path=${d.redirectTo} AND published=1`;
      if (d.redirectTo === d.path || !target.length || target[0]?.redirectTo)
        throw new Error('Redirect to an existing published page without another redirect.');
    }
    if (d.indexable && !d.redirectTo) {
      const result = await searchCreators({ ...parsed, page: 1, sort: 'newest' }, true);
      if (result.total < MIN_INDEXABLE_CREATORS || d.intro.length < 200)
        throw new Error(
          'Indexing requires at least ' +
            MIN_INDEXABLE_CREATORS +
            ' complete, non-demo profiles and 200 characters of reviewed, useful introduction.',
        );
    }
    await db.$executeRaw`INSERT INTO DiscoveryPage(path,title,description,intro,filters,published,indexable,redirectTo,updatedAt) VALUES (${d.path},${d.title},${d.description},${d.intro},${encoded},${Number(d.published)},${Number(d.indexable)},${d.redirectTo || null},${new Date().toISOString()}) ON CONFLICT(path) DO UPDATE SET title=excluded.title,description=excluded.description,intro=excluded.intro,filters=excluded.filters,published=excluded.published,indexable=excluded.indexable,redirectTo=excluded.redirectTo,updatedAt=excluded.updatedAt`;
    revalidateTag('discovery');
    revalidatePath('/discover', 'layout');
    revalidatePath('/sitemap.xml');
  } catch (error) {
    message =
      error instanceof z.ZodError
        ? 'Check the page fields and filter values.'
        : error instanceof Error && error.message.length < 240
          ? error.message
          : 'Could not save the page.';
  }
  redirect('/admin/discovery?message=' + encodeURIComponent(message));
}
async function saveTaxon(form: FormData) {
  'use server';
  await requireAdmin();
  let message = 'Category saved.';
  try {
    const d = z
      .object({
        kind: z.enum(['niche', 'city', 'language']),
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(80),
        label: z.string().trim().min(2).max(80),
        value: z.string().trim().min(2).max(80),
        parentId: z.string().max(160),
        aliases: z.string().max(1000),
      })
      .parse(Object.fromEntries(form));
    const id = d.kind + ':' + d.slug;
    const taxa = await getTaxonomy();
    if (d.parentId) {
      const parent = taxa.find((t) => t.id === d.parentId);
      if (!parent || parent.kind !== d.kind || parent.id === id)
        throw new Error('Choose a parent in the same category type.');
      let cursor = parent;
      const visited = new Set([id]);
      while (cursor) {
        if (visited.has(cursor.id)) throw new Error('Category parents cannot create a cycle.');
        visited.add(cursor.id);
        const next = taxa.find((t) => t.id === cursor.parentId);
        if (!next) break;
        cursor = next;
      }
    }
    const previous = await db.$queryRaw<
      Array<{ value: string }>
    >`SELECT value FROM DiscoveryTaxon WHERE id=${id}`;
    if (previous[0] && previous[0].value !== d.value)
      throw new Error('Stored values are stable. Edit the display label or aliases instead.');
    const aliases = JSON.stringify(
      Array.from(
        new Set(
          d.aliases
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ).slice(0, 30),
    );
    await db.$executeRaw`INSERT INTO DiscoveryTaxon(id,kind,slug,label,value,parentId,aliases) VALUES (${id},${d.kind},${d.slug},${d.label},${d.value},${d.parentId || null},${aliases}) ON CONFLICT(id) DO UPDATE SET label=excluded.label,parentId=excluded.parentId,aliases=excluded.aliases`;
    revalidatePath('/discover', 'layout');
    revalidatePath('/creators');
  } catch (error) {
    message =
      error instanceof z.ZodError
        ? 'Check the category fields.'
        : error instanceof Error && error.message.length < 240
          ? error.message
          : 'Could not save the category.';
  }
  redirect('/admin/discovery?message=' + encodeURIComponent(message));
}
export const metadata = {
  title: 'Discovery management | Kollabo',
  robots: { index: false, follow: false },
};
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; category?: string; message?: string }>;
}) {
  await requireAdmin();
  const p = await searchParams;
  const pages = await db.$queryRaw<LandingPage[]>`SELECT * FROM DiscoveryPage ORDER BY path`;
  const current = pages.find((x) => x.path === p.edit);
  const taxa = await getTaxonomy();
  const taxon = taxa.find((t) => t.id === p.category);
  return (
    <main className="cc-container py-10">
      <p className="cc-eyebrow mb-3">Editorial workspace</p>
      <h1 className="cc-title">Discovery management</h1>
      <p className="cc-subtle my-4">
        Publish useful pages deliberately. Indexing approval also checks profile supply whenever a
        page is served.
      </p>
      {p.message && (
        <p role="status" className="cc-panel p-4 mb-6">
          {p.message}
        </p>
      )}
      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-semibold mb-5">
            {current ? 'Edit' : 'Create'} landing page
          </h2>
          <form
            key={current?.path || 'new-page'}
            action={savePage}
            className="cc-panel p-6 space-y-4"
          >
            {[
              ['path', 'Path after /discover/', current?.path || ''],
              ['title', 'Page title', current?.title || ''],
              ['description', 'Search description', current?.description || ''],
              ['redirectTo', 'Redirect to page path (optional)', current?.redirectTo || ''],
            ].map(([name, label, value]) => (
              <label key={name} className="cc-label">
                {label}
                <input
                  className="cc-field mt-2"
                  name={name}
                  defaultValue={value}
                  required={name !== 'redirectTo'}
                  readOnly={name === 'path' && !!current}
                />
              </label>
            ))}
            <label className="cc-label">
              Useful introduction
              <textarea
                className="cc-field mt-2"
                name="intro"
                rows={6}
                required
                defaultValue={current?.intro}
              />
            </label>
            <fieldset className="space-y-4">
              <legend className="font-semibold mb-3">Who belongs on this page?</legend>
              {['niche', 'city', 'language', 'format'].map((kind) => (
                <label key={kind} className="cc-label capitalize">
                  {kind === 'city' ? 'Creator city' : kind}
                  <select
                    name={'filter.' + kind}
                    className="cc-field mt-2"
                    defaultValue={current ? JSON.parse(current.filters)[kind] || '' : ''}
                  >
                    <option value="">Any</option>
                    {taxa
                      .filter((t) => t.kind === kind)
                      .map((t) => (
                        <option key={t.id} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
              <label className="cc-label">
                Platform
                <select
                  name="filter.platform"
                  className="cc-field mt-2"
                  defaultValue={current ? JSON.parse(current.filters).platform || '' : ''}
                >
                  <option value="">Any platform</option>
                  {['instagram', 'youtube', 'facebook', 'tiktok'].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="cc-label">
                Maximum starting rate (PKR, optional)
                <input
                  name="filter.rate"
                  type="number"
                  min="0"
                  max="2147483647"
                  className="cc-field mt-2"
                  defaultValue={current ? (JSON.parse(current.filters).rate ?? '') : ''}
                />
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  name="filter.available"
                  value="1"
                  defaultChecked={current ? JSON.parse(current.filters).available === '1' : false}
                />
                Available for collaborations only
              </label>
            </fieldset>
            <label className="flex gap-2">
              <input
                type="checkbox"
                name="published"
                defaultChecked={Boolean(current?.published)}
              />
              Published
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                name="indexable"
                defaultChecked={Boolean(current?.indexable)}
              />
              Editorially approved for indexing
            </label>
            <button className="cc-button">Save page</button>
          </form>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-5">
            {taxon ? 'Edit' : 'Create'} category or alias
          </h2>
          <form
            key={taxon?.id || 'new-category'}
            action={saveTaxon}
            className="cc-panel p-6 space-y-4"
          >
            <label className="cc-label">
              Type
              <select name="kind" className="cc-field mt-2" defaultValue={taxon?.kind || 'niche'}>
                <option value="niche">Niche</option>
                <option value="city">Creator city</option>
                <option value="language">Language</option>
              </select>
            </label>
            {[
              ['slug', 'Stable slug', taxon?.slug || ''],
              ['label', 'Display label', taxon?.label || ''],
              ['value', 'Stable stored value', taxon?.value || ''],
              [
                'aliases',
                'Search aliases, separated by commas',
                taxon ? JSON.parse(taxon.aliases).join(', ') : '',
              ],
            ].map(([name, label, value]) => (
              <label key={name} className="cc-label">
                {label}
                <input
                  className="cc-field mt-2"
                  name={name}
                  defaultValue={value}
                  required={['slug', 'label', 'value'].includes(name!)}
                  readOnly={!!taxon && ['slug', 'value'].includes(name!)}
                />
              </label>
            ))}
            <label className="cc-label">
              Parent category (optional)
              <select
                name="parentId"
                className="cc-field mt-2"
                defaultValue={taxon?.parentId || ''}
              >
                <option value="">No parent</option>
                {taxa
                  .filter((t) => t.id !== taxon?.id && (!taxon || t.kind === taxon.kind))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.kind})
                    </option>
                  ))}
              </select>
            </label>
            <button className="cc-button">Save category</button>
          </form>
        </section>
      </div>
      <h2 className="text-2xl font-semibold mt-12 mb-5">Landing pages</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pages.map((page) => (
          <Link
            key={page.path}
            href={'?edit=' + encodeURIComponent(page.path)}
            className="cc-panel p-4"
          >
            <p className="font-medium">{page.title}</p>
            <p className="text-xs cc-subtle mt-2">
              {page.path} · {page.published ? 'Published' : 'Draft'} ·{' '}
              {page.indexable ? 'Indexing approved' : 'Not approved'}
            </p>
          </Link>
        ))}
      </div>
      <h2 className="text-2xl font-semibold mt-10 mb-5">Categories</h2>
      <div className="flex gap-3 flex-wrap">
        {taxa
          .filter((t) => t.kind !== 'format')
          .map((t) => (
            <Link
              key={t.id}
              className="cc-button cc-button-secondary text-sm"
              href={'?category=' + encodeURIComponent(t.id)}
            >
              {t.label} · {t.id}
            </Link>
          ))}
      </div>
    </main>
  );
}
