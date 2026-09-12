import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { searchCreators } from '@/lib/discovery-search';
import {
  getTaxonomy,
  interpretQuery,
  parseFilters,
  resolveTaxon,
  suggestTaxa,
} from '@/lib/discovery-taxonomy';
import { CreatorDirectory } from '@/components/creator/directory';
import { SiteFooter } from '@/components/landing/site-footer';
import { Breadcrumb } from '@/components/ui/breadcrumb';
export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ searchParams }: Props) {
  const p = await searchParams;
  const query = new URLSearchParams(
    Object.entries(p).filter(([, v]) => typeof v === 'string') as [string, string][],
  );
  return {
    title: 'Discover Pakistani creators | Kollabo',
    description:
      'Search creator profiles by niche, city, language, platform and deliverable rates.',
    alternates: { canonical: '/creators' + (query.size ? '?' + query : '') },
    robots: { index: !Object.keys(p).some((k) => k !== 'page'), follow: true },
  };
}
export default async function CreatorsBrowsePage({ searchParams }: Props) {
  const raw = await searchParams;
  const parsed = parseFilters(raw);
  if (!parsed.success) notFound();
  const f = parsed.data;
  const taxa = await getTaxonomy();
  if (f.q) {
    const interpreted = interpretQuery(f.q, taxa);
    if (!interpreted.clarification && Object.keys(interpreted.filters).some((k) => k !== 'q')) {
      const next = new URLSearchParams(
        Object.entries(raw).filter(([, v]) => typeof v === 'string') as [string, string][],
      );
      next.delete('q');
      next.delete('page');
      for (const [k, v] of Object.entries(interpreted.filters)) if (!next.has(k)) next.set(k, v);
      redirect('/creators?' + next.toString());
    }
  }
  // Aliases share one filter value, including older homepage links.
  for (const kind of ['niche', 'city', 'language'] as const) {
    if (f[kind]) {
      const t = resolveTaxon(taxa, kind, f[kind]!);
      if (t && f[kind] !== t.value) {
        const next = new URLSearchParams(
          Object.entries(raw).filter(([, v]) => typeof v === 'string') as [string, string][],
        );
        next.set(kind, t.value);
        redirect('/creators?' + next.toString());
      }
    }
  }
  const result = await searchCreators(f);
  if (f.page > 1 && f.page > result.pages) notFound();
  return (
    <>
      <main className="cc-container pt-9 pb-12">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Discover' }]} />
        <div className="mb-8 mt-6">
          <p className="cc-eyebrow mb-3">Find your people</p>
          <h1 className="cc-title">Discover Pakistani creators.</h1>
          <p className="cc-subtle mt-3 max-w-2xl">
            Find the right perspective by niche, location, platform, and the work you need.
          </p>
          <Link href="/discover" className="cc-link inline-block mt-4 text-sm">
            Explore categories and cities →
          </Link>
        </div>
        {f.q && interpretQuery(f.q, taxa).clarification && (
          <p role="status" className="cc-panel p-4 mb-5">
            {interpretQuery(f.q, taxa).clarification}
          </p>
        )}
        {result.total === 0 && f.q && suggestTaxa(f.q, taxa).length > 0 && (
          <div className="cc-panel p-5 mb-5">
            <p className="font-medium mb-3">Did you mean?</p>
            <div className="flex gap-3 flex-wrap">
              {suggestTaxa(f.q, taxa).map((t) => (
                <Link
                  key={t.id}
                  className="cc-button cc-button-secondary"
                  href={'/creators?' + new URLSearchParams({ [t.kind]: t.value }).toString()}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
        )}
        <CreatorDirectory {...result} />
        <p className="cc-subtle text-xs mt-6">
          City means where the creator is based. Audience sizes across platforms may overlap.
          Budgets filter starting rates; select a deliverable to compare its price.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
