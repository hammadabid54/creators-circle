# Creator recommendations v1

Recommended is now the default on /creators and managed discovery landing pages. The former newest/followers/rate/engagement sorts remain explicit alternatives. Homepage community cards retain their recent-profile selection; the change applies to discovery results.

## Ordering

1. Apply every requested filter first. Recommendations cannot broaden niche, location, language, platform, budget, availability or saved-list constraints.
2. Place demonstration profiles after real profiles. Public SEO landing listings continue to exclude demonstration profiles entirely.
3. For remaining free-text words, prioritize name/handle matches over biography-only matches. Each word contributes two relevance points for a name match and two for a handle match; repetitions in profile text add nothing. This relevance tier precedes the readiness score.
4. Order by the bounded score below, then stable user ID. Pagination uses the ranked database query, not client-side reordering of one page.

## Bounded signals (maximum 100)

| Signal | Maximum | Policy |
|---|---:|---|
| Profile readiness | 50 | Bio at least 40 characters = 5, at least 80 = 10; up to three linked portfolio items = 5 each; at least one rate = 10; city plus managed niche = 5; managed language = 5; photo URL = 5. This measures useful information, not artistic quality or file ownership. |
| Availability | 15 | Creator is open to collaborations. This is self-declared. |
| Data confidence and engagement | 15 | A connected account successfully refreshed in the last 30 days = 10. Engagement contributes up to 5 through a same-platform peer percentile. Only rates from 0–100, accounts with at least 1,000 followers, and cohorts of at least 20 fresh accounts qualify. Tied values use a midpoint percentile. Multiple platforms use the average eligible percentile; selecting a platform restricts the creator signals to it. Missing/stale/insufficient-cohort engagement is neutral at 2.5, never invented as zero. Profiles containing demo accounts do not enter these cohorts. |
| Approved collaboration history | 20 | Everyone starts at 8. Each distinct brand with qualifying completed work adds 2.4, capped at five brands (20 total). A qualifying contract is completed, has milestones, every milestone is approved, and has an approved submission with a recorded approval by that contract's brand. Self-contracts and self-entered portfolio collaboration claims do not count. |

No direct follower-count boost, no cheap-price boost, no profile-age boost, no paid placement and no assumed response-time or review-rating score. New creators can compete through readiness and availability before accumulating history. This policy is not a conversion-optimized or scientifically validated quality score; tuning needs real outcome data after launch.

## User transparency

The directory includes “How recommendations work”. Recommended cards include “Why this result?” with evidence-based reasons. We do not show a pseudo-precise public quality score. Other sort modes omit recommendation reasons. Managed category pages inherit the new default; cached results use a new cache version and expire in five minutes. Delivery actions invalidate discovery caches after saving.

## Verification

18 discovery tests and 35 authentication/workflow checks passed (53 total). Ranking-specific checks cover the default, stable adjacent pages at 10,050 profiles, small versus large accounts, explicit sort overrides, text relevance, demo demotion, stale and missing metrics, minimum engagement cohort size and genuine completed-work evidence. Two adjacent recommended queries including facets took approximately 195 ms on the local fixture; this is not a concurrent production load test.

## Limitations and next measurement

Current live social ingestion does not yet provide broad engagement coverage, so many profiles will receive neutral engagement until provider data is available. Readiness is self-entered information, not content moderation. A few colluding accounts could manufacture approved work; capped distinct-brand contributions reduce but do not eliminate manipulation. Moderation, verified review collection, response-time instrumentation, brand diversity auditing, ranking exposure/outcome analytics and experiments remain future work. No external API or model is required to run this ranking.

Browser checks passed: Recommended selected by default, explanation panels expand with the actual supporting reasons, manual follower sorting removes recommendation explanations, and paginated filtered pages return 200 while retaining noindex. Production build passed with lint and TypeScript validation.

Mobile recommendation reasons were visually checked at 390px. QA fixture server was stopped and the normal local preview restored with Recommended selected.
