# Discovery hierarchy and internal links

Implemented September 9, 2026.

## Navigation

- New directories: `/discover/niches`, `/discover/cities`, `/discover/platforms`.
- Niche directory groups published specialities under their parent niches. All published niche collections remain reachable through the full speciality list.
- Landing breadcrumbs follow the taxonomy rather than guessing parents from URL segments. Example: Home → Discover → Niches → Fashion → Modest Fashion.
- Niche pages link to their specialities, related niches, and the same niche in other cities.
- City pages link to niches within that city and other city landing pages.
- Combined collections link back to their broader niche and city pages. More specific collections appear in the relevant directory hubs.
- Existing editorial URLs are preserved. Published curated combinations are used automatically when their filters match; unpublished combinations are omitted instead of linking to filtered search.

## Publishing and SEO

The discovery seed now includes taxonomy children, adding the existing Modest Fashion, Skincare, and Restaurant Reviews specialities locally. Existing editorial records are preserved. New collections start without indexing approval.

Links are server-rendered anchors with descriptive labels. Related groups contain at most 12 unique destinations and omit self-links; directory hubs provide access to the wider collection. Drafts, redirects, invalid filters, and reserved directory paths are excluded from generated collection links. The admin editor reserves the three directory root paths.

Breadcrumb structured data follows the visible hierarchy when a valid public SITE_URL is configured. The three directories are included in sitemap generation. Existing landing-page indexing approval, minimum real-profile requirements, canonicals, pagination, and filtered-search noindex behavior remain in place. This change does not automatically publish every city/niche combination or approve thin pages for indexing.

To add a curated combination, publish a managed collection with the appropriate niche and city filters. Both parent contexts will select its actual editorial URL automatically. Indexing still requires the existing editorial/content checks and sufficient real profiles.

## Verification

- Production build passed, including type and lint checks.
- 25 discovery checks passed, including seven hierarchy cases: parent/child navigation, taxonomy breadcrumbs, absence of filtered-search fallbacks, published combination selection, invalid/draft exclusion, bounded unique links, and renamed editorial paths.
- 34 authentication and collaboration regression checks passed (59 automated checks total).
- Discovery regression fixture: 10,050 profiles; two recommended-page queries took 210 ms locally. This is a local fixture measurement, not production load testing.
- Crawled 35 linked discovery URLs on the production preview: all returned HTTP 200. An unknown landing URL returned 404.
- Browser verified directory → speciality navigation, parent breadcrumbs, Karachi → Fashion search with both filters selected, and a 390px mobile speciality page.
- Confirmed speciality canonical and `noindex, follow` on the local preview. Public-domain JSON-LD remains conditional on SITE_URL and was not exercised against a live domain.

Preview: http://localhost:3100/discover/niches

## Homepage link correction
Homepage Explore chips now point directly to the Fashion, Food & Cooking, Lifestyle and Tech & Gadgets landing pages. Related links only target published collections. The landing-page search button opens the general directory without a query string. User-entered directory search remains available. The 25 discovery checks passed again after this correction.
