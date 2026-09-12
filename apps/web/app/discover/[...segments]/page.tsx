import { discoveryHierarchy } from '@/lib/discovery-links';
import { cachedLandingResults } from '@/lib/discovery-cache';
import { publicSiteUrl } from '@/lib/site-url';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { getLandingPage, getLandingPages, filterSchema } from '@/lib/discovery-taxonomy';
import { MIN_INDEXABLE_CREATORS } from '@/lib/discovery-search';
import { CreatorCard } from '@/components/creator/creator-card';
import { SiteFooter } from '@/components/landing/site-footer';
export const dynamic = 'force-dynamic';
type Props = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
async function context(props: Props) {
  const { segments } = await props.params;
  const path = segments.join('/');
  const page = await getLandingPage(path);
  if (!page) notFound();
  if (page.redirectTo) permanentRedirect('/discover/' + page.redirectTo);
  const query = await props.searchParams;
  if (Object.keys(query).some((k) => k !== 'page')) notFound();
  const n = Number(query.page || 1);
  if (!Number.isInteger(n) || n < 1 || n > 10000) notFound();
  const f = filterSchema.safeParse({ ...JSON.parse(page.filters), page: n });
  if (!f.success) notFound();
  const result = await cachedLandingResults(JSON.stringify(f.data));
  if (n > 1 && n > result.pages) notFound();
  return { page, result, filters: f.data };
}
export async function generateMetadata(props: Props) {
  const { page, result } = await context(props);
  return {
    title: page.title + ' | Kollabo',
    description: page.description,
    alternates: {
      canonical: '/discover/' + page.path + (result.page > 1 ? '?page=' + result.page : ''),
    },
    robots: {
      index: Boolean(page.indexable) && result.total >= MIN_INDEXABLE_CREATORS,
      follow: true,
    },
    openGraph: { title: page.title, description: page.description, url: '/discover/' + page.path },
  };
}
export default async function Landing(props: Props) {
  const { page, result } = await context(props);
  const all = await getLandingPages();
  const hierarchy = discoveryHierarchy(page, all, result.taxa);
  const site = publicSiteUrl();
  const breadcrumbs = site
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: hierarchy.breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.label,
          item: site + crumb.href,
        })),
      }
    : null;
  return (
    <>
      {breadcrumbs && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, '\\u003c') }}
        />
      )}
      <main className="cc-container py-10">
        <nav aria-label="Breadcrumb" className="text-sm cc-subtle mb-7">
          <ol className="flex flex-wrap gap-2">
            {hierarchy.breadcrumbs.map((crumb, i) => (
              <li key={crumb.href} className="flex gap-2">
                {i > 0 && <span aria-hidden="true">/</span>}
                {i === hierarchy.breadcrumbs.length - 1 ? (
                  <span aria-current="page">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href}>{crumb.label}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <p className="cc-eyebrow mb-3">Find your next collaborator</p>
        <h1 className="cc-title max-w-4xl">{page.title}</h1>
        <p className="cc-subtle mt-5 max-w-3xl whitespace-pre-line">{page.intro}</p>
        <div className="flex flex-wrap justify-between gap-4 items-center my-8">
          <p className="text-sm">
            {result.total} matching creator{result.total === 1 ? '' : 's'}
          </p>
          <Link href="/creators" className="cc-button cc-button-secondary">
            Search all creators
          </Link>
        </div>
        {result.creators.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {result.creators.map((c) => (
              <CreatorCard key={c.id} creator={c} />
            ))}
          </div>
        ) : (
          <div className="cc-panel p-10 text-center">
            <h2 className="text-2xl font-semibold">This circle is still growing.</h2>
            <p className="cc-subtle my-4">
              No complete public profiles match this category yet. Explore a broader search or join
              the community.
            </p>
            <Link href="/creators" className="cc-link">
              Explore creators
            </Link>
          </div>
        )}
        {result.pages > 1 && (
          <nav aria-label="Creator result pages" className="flex justify-center gap-5 mt-8">
            {result.page > 1 && (
              <Link
                href={
                  '/discover/' + page.path + (result.page > 2 ? '?page=' + (result.page - 1) : '')
                }
              >
                Previous
              </Link>
            )}
            <span>
              Page {result.page} of {result.pages}
            </span>
            {result.page < result.pages && (
              <Link href={'/discover/' + page.path + '?page=' + (result.page + 1)}>Next</Link>
            )}
          </nav>
        )}
        <section className="mt-12 border-t border-anjuman-line pt-8">
          <h2 className="text-2xl font-semibold mb-4">Make an informed choice.</h2>
          <p className="cc-subtle max-w-3xl">
            Compare examples of relevant work, the platform you plan to use, and the rate for your
            specific deliverable. Creator location describes where someone is based, not where their
            audience lives. Confirm the brief, timeline, usage rights, and final price before
            agreeing to a collaboration.
          </p>
          <nav aria-label="Related creator categories" className="mt-8 space-y-8">
            {hierarchy.groups.map((group) => (
              <section key={group.title}>
                <h2 className="text-xl font-semibold mb-4">{group.title}</h2>
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link className="cc-link text-sm" href={link.href}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="flex flex-wrap gap-5 border-t border-anjuman-line pt-5">
              <Link className="cc-link" href="/discover/niches">
                All niches and specialities
              </Link>
              <Link className="cc-link" href="/discover/cities">
                All creator cities
              </Link>
              <Link className="cc-link" href="/discover/platforms">
                All platforms
              </Link>
            </div>
          </nav>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
