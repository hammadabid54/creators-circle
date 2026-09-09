import Link from 'next/link';
import { getLandingPages, getTaxonomy } from '@/lib/discovery-taxonomy';
import { publishedCollections } from '@/lib/discovery-links';
import { SiteFooter } from '@/components/landing/site-footer';
import { publicSiteUrl } from '@/lib/site-url';
export async function DiscoveryIndex({ kind }: { kind: 'niche' | 'city' | 'platform' }) {
  const [pages, taxa] = await Promise.all([getLandingPages(), getTaxonomy()]);
  const collections = publishedCollections(pages, taxa).filter((x) => x.filters[kind]);
  const roots = collections.filter((x) => Object.keys(x.filters).length === 1);
  const combinations = collections.filter((x) => Object.keys(x.filters).length > 1);
  const title = {
    niche: 'Explore creator niches',
    city: 'Find creators by city',
    platform: 'Explore creator platforms',
  }[kind];
  const label = kind === 'niche' ? 'Niches' : kind === 'city' ? 'Cities' : 'Platforms';
  const site = publicSiteUrl();
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Discover', href: '/discover' },
    { label, href: '/discover/' + label.toLowerCase() },
  ];
  return (
    <>
      {site && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: breadcrumbs.map((crumb, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: crumb.label,
                item: site + crumb.href,
              })),
            }).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <main className="cc-container py-12">
        <nav aria-label="Breadcrumb" className="cc-subtle text-sm mb-6">
          <Link href="/">Home</Link> / <Link href="/discover">Discover</Link> /{' '}
          <span aria-current="page">{label}</span>
        </nav>
        <h1 className="cc-title">{title}</h1>
        <p className="cc-subtle mt-4 mb-8">
          {kind === 'city'
            ? 'Choose where your creator is based, then explore their specialities.'
            : 'Start broad or choose a speciality to find the right perspective.'}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {roots
            .filter(
              (x) =>
                kind !== 'niche' ||
                !taxa.find((t) => t.kind === 'niche' && t.value === x.filters.niche)?.parentId,
            )
            .map((x) => {
              const taxon = taxa.find((t) => t.kind === kind && t.value === x.filters[kind]);
              const children =
                kind === 'niche'
                  ? roots.filter(
                      (y) =>
                        taxa.find((t) => t.kind === 'niche' && t.value === y.filters.niche)
                          ?.parentId === taxon?.id,
                    )
                  : [];
              return (
                <section key={x.page.path} className="cc-panel p-5">
                  <h2 className="text-lg font-semibold">
                    <Link className="cc-link" href={'/discover/' + x.page.path}>
                      {x.page.title}
                    </Link>
                  </h2>
                  <p className="cc-subtle text-sm mt-2">{x.page.description}</p>
                  {children.length > 0 && (
                    <ul className="border-t border-anjuman-line mt-4 pt-3 space-y-2">
                      {children.map((c) => (
                        <li key={c.page.path}>
                          <Link className="cc-link text-sm" href={'/discover/' + c.page.path}>
                            {c.page.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
        </div>
        {kind === 'niche' && (
          <details className="mt-8">
            <summary className="font-semibold cursor-pointer">All specialities</summary>
            <ul className="mt-4 grid sm:grid-cols-2 gap-3">
              {roots.map((x) => (
                <li key={x.page.path}>
                  <Link className="cc-link" href={'/discover/' + x.page.path}>
                    {x.page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
        {combinations.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold mb-5">More specific collections</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {combinations.map((x) => (
                <li key={x.page.path}>
                  <Link className="cc-link" href={'/discover/' + x.page.path}>
                    {x.page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <nav
          aria-label="Explore discovery"
          className="flex flex-wrap gap-5 border-t border-anjuman-line mt-10 pt-6"
        >
          <Link className="cc-link" href="/discover/niches">
            All niches
          </Link>
          <Link className="cc-link" href="/discover/cities">
            All cities
          </Link>
          <Link className="cc-link" href="/discover/platforms">
            All platforms
          </Link>
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}
