# QA implementation progress — 9 September 2026

This is the current status of QA_REPORT.md, whose original findings remain preserved as a baseline. The project is still a prototype, not a production launch sign-off.

## Creator profile analytics

Added a responsive Audience & performance section with platform selection, 30/90-day follower charts, accessible dated measurement tables, recent-content view bars, audience-city percentages, and age distributions. Missing data has explanatory empty states rather than invented values. Existing demonstration accounts are explicitly labeled and excluded from historical charts. The portfolio remains above analytics.

A versioned SQLite migration adds CreatorMetricSnapshot. The server validates and records provider observations and selects only public metrics for the client. Snapshots are separate from editable profile fields and social credentials. A real YouTube channel fetch now retrieves identity and subscriber counts; initial connections and successful manual refreshes record measurements. Expired Google tokens can be refreshed, and absent refresh tokens require reconnection. Failed or unsupported syncs do not advance successful-sync timestamps. Manual refresh is exposed only to the profile owner.

**Data boundaries:** there is no invented historical backfill. Follower charts need at least two observations in the chosen period. Post-level and demographic charts are implemented and tested with isolated fixtures, but their provider ingestion is not yet implemented. The existing flat Audience data has no platform provenance or city percentages, so it is not repackaged as measured analytics. Real OAuth/API calls were not performed during QA; provider response parsing and error handling were tested with controlled responses.

## Completed in this pass

- OTP generation uses cryptographic randomness. Stored codes use a keyed HMAC with the authentication secret rather than plaintext. Wrong guesses consume attempts; five attempts lock a challenge; consumption uses a conditional database write. Resend has a 60-second cooldown and three-per-phone hourly limit within a transaction. Superseded codes are invalidated. Existing plaintext challenges are no longer accepted.
- Phone inputs normalize consistently and require a Pakistani mobile-number shape. Codes must contain six digits. Live codes are no longer logged.
- Production SMS requests return an explicit 503 until delivery is implemented, instead of claiming success. Local development retains the visible preview code.
- Session roles reload from the database rather than accepting client updates. Initial role selection is transactional and cannot switch an established account to another role.
- Edge middleware uses a database-free auth configuration. Authoritative session checks stay server-side.
- Social mock mode requires both development mode and SOCIAL_MOCK_MODE=true. Production cannot enable mocks. Unsupported Meta and TikTok connections fail explicitly instead of manufacturing connected accounts; their existing demonstration branches remain available only in explicit development mode.
- Next.js and eslint-config-next upgraded from 15.1.0 to 15.5.24. This is the maintenance release specified by the [official August 2026 security advisory](https://nextjs.org/blog/august-2026-security-release). Lockfile and installed dependencies updated; regenerated Prisma Client 6.19.3.
- Replaced obsolete stub probes with 15 isolated SQLite checks. Added GitHub Actions build and regression gates; the workflow is written but has not run remotely.

## Already resolved by the redesign

Build/type/lint blockers; public discovery prefix matching and query preservation; inert primary navigation; mobile menu; canonical niche aliases; genuine RateCard prices and newest sorting; demonstration labels; onboarding drafts; preservation of social connections; explicit proposal states; transactional acceptance; contract-based inbox, conversations, and message submission; working review controls; browser-local saving and comparison.

## Validation

- TypeScript passed, Prisma schema validated, and Prisma client generation succeeded.
- Fifteen checks passed against disposable SQLite data: phone validation, OTP storage protection, attempt lockout, concurrent single consumption, resend rollback, role escalation prevention, campaign ownership, duplicate acceptance prevention, conversation authorization, metric validation, snapshot persistence/idempotency, YouTube response parsing, failed-sync timestamp preservation, production SMS failure, and production mock denial.
- Browser-tested 30/90-day selection with three versus four dated observations, populated content/location/age charts, and responsive layout at 390px with no horizontal overflow.
- Final production build passed on Next.js 15.5.24 after all changes, including lint/type validation and all 31 static pages.
- No real SMS, provider authorization, payment, or user-record write test was performed. The additive analytics table was applied to the local app database; all test measurements were kept in disposable databases under apps/web/.qa.

## Remaining priorities

1. Production SMS delivery with an approved provider, verified end-to-end delivery, and persistent IP/gateway abuse limits. Current protection is per phone/challenge, not a complete IP-based abuse defense.
2. Provider integration completion: Meta/TikTok, post-level data, audience demographics, token encryption at rest, durable background sync with deduplication/retries, retention/deletion policy, and live credential-based verification. YouTube currently collects identity/subscriber counts only.
3. Durable application-to-contract uniqueness and migration/backfill strategy for preexisting data; broader transition/concurrency coverage against the chosen production database.
4. Database-side discovery filtering and cursor pagination, cross-device saved shortlists, creator invitations, campaign templates, and a notification center. Current saving is browser-local and drafts are tab-local.
5. Delivery/revision/approval workspace; payment ledger invariants, reconciliation, disputes, support tools, and operational monitoring before money moves.
6. Full dependency audit, backup/restore exercises, deployed security verification, screen-reader review, localization, and native mobile implementation.

## Local setup and checks

Use Node 24 for the SQLite migration/test scripts and pnpm 9.15.0. Run from apps/web:

```text
pnpm exec prisma generate
node scripts/migrate.cjs prisma/dev.db
node qa-regressions.cjs
pnpm build
```

The migration runner applies additive SQL files once and records their versions. It does not replace the production PostgreSQL migration strategy; do not change the provider string and assume SQLite migrations apply unchanged. Keep AUTH_SECRET stable and private. Rotating it invalidates existing OTP digests as well as authentication sessions. SMS preview codes and SOCIAL_MOCK_MODE work only with a development server.

YouTube implementation references: [channel statistics](https://developers.google.com/youtube/v3/docs/channels/list) and [Google refresh-token flow](https://developers.google.com/identity/protocols/oauth2/web-server#offline).

## Discovery follow-up
Implemented taxonomy, managed SEO landing pages, combined search and database pagination. See DISCOVERY_UPDATE.md for verification and launch requirements.

## Email sign-in and authenticated QA follow-up
Email OTP and account linking implemented. Expanded suite: 42 passing checks. Browser-tested brand/creator collaboration and admin publishing; see AUTH_QA_UPDATE.md and ONBOARDING_GUIDE.md for current details and limitations.

## Work delivery and approvals
Implemented creator submissions, brand revision requests and approvals, version history and contract completion. See DELIVERY_UPDATE.md. Payments remain unchanged.

## Recommended creator ranking
Default discovery order now uses explainable recommendations. See RANKING_UPDATE.md for signal weights, guardrails, 10,050-profile testing and remaining measurement needs. Expanded tests: 53 passing checks.

## Internal linking hierarchy
Added niche, city and platform directories, taxonomy breadcrumbs, speciality navigation and contextual city/niche links. See INTERNAL_LINKING_UPDATE.md. Current verified count: 25 discovery plus 34 authentication/collaboration checks (59 total; earlier totals above were overstated by one). Production build passed and all 35 linked discovery pages returned 200. Browser checks covered mobile breadcrumbs and retained city/niche filters.
