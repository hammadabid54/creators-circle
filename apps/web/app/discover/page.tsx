import { publishedCollections } from '@/lib/discovery-links';
import Link from 'next/link';
import { getLandingPages, getTaxonomy, type LandingPage } from '@/lib/discovery-taxonomy';
import { SiteFooter } from '@/components/landing/site-footer';
import { Breadcrumb } from '@/components/ui/breadcrumb';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Explore creator categories and cities | Kollabo',
  description: 'Browse Pakistani creators by niche, location and social platform.',
  alternates: { canonical: '/discover' },
};
export default async function Discover() {
  const collections = publishedCollections(await getLandingPages(), await getTaxonomy());
  const categoryPages = (kind: string) =>
    collections
      .filter((x) => Object.keys(x.filters).length === 1 && x.filters[kind])
      .map((x) => x.page);
  return (
    <>
      <main className="cc-container py-12">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Discover' }]} />
        <div className="mt-6">
          <p className="cc-eyebrow mb-3">Every perspective has a place</p>
          <h1 className="cc-title">Find your corner of the circle.</h1>
        </div>
        <p className="cc-subtle max-w-2xl mt-4 mb-7">
          Start with an interest, a city, or a platform. Explore real profiles and refine your
          search as you go.
        </p>
        <form action="/creators" className="flex gap-3 max-w-2xl mb-12">
          <label className="sr-only" htmlFor="hub-search">
            Search creators
          </label>
          <input
            id="hub-search"
            name="q"
            className="cc-field"
            placeholder="Try Urdu food creators in Lahore"
          />
          <button className="cc-button">Search</button>
        </form>
        <nav aria-label="Discovery directories" className="flex flex-wrap gap-3 mb-10">
          <Link className="cc-button cc-button-secondary" href="/discover/niches">
            Niches & specialities
          </Link>
          <Link className="cc-button cc-button-secondary" href="/discover/cities">
            Cities in Pakistan
          </Link>
          <Link className="cc-button cc-button-secondary" href="/discover/platforms">
            Platforms
          </Link>
        </nav>
        {[
          ['Niches', categoryPages('niche')],
          ['Cities', categoryPages('city')],
          ['Platforms', categoryPages('platform')],
          [
            'More ways to explore',
            collections
              .filter(
                (x) =>
                  !(
                    Object.keys(x.filters).length === 1 &&
                    ['niche', 'city', 'platform'].some((k) => x.filters[k])
                  ),
              )
              .map((x) => x.page),
          ],
        ].map(
          ([label, items]) =>
            !!(items as LandingPage[]).length && (
              <section key={label as string} className="mb-12">
                <h2 className="text-2xl font-semibold mb-5">{label as string}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(items as LandingPage[]).map((p) => (
                    <Link
                      key={p.path}
                      href={'/discover/' + p.path}
                      className="cc-panel p-5 hover:border-anjuman-purple"
                    >
                      <h3 className="font-semibold">{p.title}</h3>
                      <p className="cc-subtle text-sm mt-2">{p.description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ),
        )}
      </main>
      <SiteFooter />
    </>
  );
}
