# Creators Circle project review

> **Implementation update:** The review below is the original baseline. The web redesign resolved its build, navigation, discovery pricing, profile preservation, and core messaging issues. The subsequent analytics/security pass is tracked in `QA_PROGRESS.md`; remaining items are explicitly listed there.

Reviewed 9 September 2026. **Verdict: useful prototype; not ready for public launch.** The visual identity is coherent, and campaign creation, applications, profiles, and role-specific dashboards have meaningful implementation. However, the production build fails, authorization trusts client-supplied roles, OTP protections are defective, and the hiring/messaging journey cannot be completed through the interface.

## What was checked

| Check | Result |
|---|---|
| Web TypeScript check | Failed: missing `campaign` relation in messaging and missing `lib/date-utils` module |
| Web production build | Failed during type validation in the messaging route; also emitted a Prisma/Edge runtime warning |
| Web lint | Failed: 21 errors, mainly unused values and unescaped text; one image optimization warning |
| Mobile TypeScript check | Passed; mobile app itself remains a static scaffold |
| Homepage desktop browser review | Rendered; header Get started click did not navigate |
| Homepage responsive check | 390×844 viewport; no horizontal document overflow detected; navigation and Sign in disappear without a mobile menu |
| Search navigation | Redirected to sign-in despite “Free to browse”; filter parameters were lost from callback URL |
| Sign-in UI | Rendered; Terms and Privacy links point to `#` |
| Messages destination | `/messages` returned a 404 |
| Focused behavioral probes | Eight expected-behavior checks failed against current source or its routing rule |

The regression probes use transpiled project source and an in-memory database stub. They cover OTP attempts and reuse, client role changes, application status mapping and repeated acceptance. The routing probe checks the prefix rule; its result was separately confirmed in the browser. These are targeted reproductions, not full database integration tests or a complete test suite.

The installed local binaries were used because pnpm was unavailable globally and unavailable in the offline npm cache. An existing process occupied port 3000 and displayed a development error page. Browser review used a temporary preview on port 3100 after the production build finished. Search redirects used the configured localhost:3000 origin; the incorrect authentication requirement is independently evident in middleware. The production build used the normal `.next` output, so the existing process's error page is not counted as a product defect. The temporary preview was stopped after review.

No real SMS, OAuth provider, payment, contract signing, or messaging transaction was performed. Authenticated screens were reviewed in source, not certified through end-to-end browser tests. No production data was changed. Performance under load, native device behavior, deployed security headers, screen-reader behavior, and full dependency auditing remain unverified.

## Launch blockers and functional defects

Priority meanings: **P0** = security blocker before public exposure; **P1** = broken core flow or build; **P2** = correctness, usability, or maintainability issue.

| Priority | Finding and evidence | Recommended correction |
|---|---|---|
| P0 | **The client can change its authorization role.** `apps/web/lib/auth.ts:69–72` copies `session.role` into the JWT during session updates. A focused probe promoted a creator token to `admin`. Multiple APIs authorize using that role. An admin portal does not currently exist, so this is not a claim of demonstrated admin-data access. | Load the role from the database using the authenticated user ID. Permit role changes through a controlled server operation; do not trust session-update input for privileges. |
| P0 | **OTP attempt limiting does not work.** `apps/web/lib/otp.ts:37–55` queries by the submitted code before comparing it. A wrong guess finds no token, so the increment branch is unreachable. Five wrong guesses did not block a subsequent correct code in the probe. | Identify the current challenge independently of the guessed code; increment attempts atomically and enforce challenge, phone, and IP limits. Use cryptographic randomness instead of `Math.random`, and protect stored OTP values. |
| P0 | **OTP consumption is not atomic.** `apps/web/lib/otp.ts:37–61` reads then unconditionally updates the token. Two concurrent verifications both succeeded in the stubbed concurrency test. | Consume only an unconsumed, valid challenge with a conditional database operation; verify the affected-row count. Add real database concurrency coverage. |
| P0 | **Framework security patches are missing.** The project pins Next.js 15.1.0, which is within affected ranges in official security advisories. | Upgrade to a currently patched supported release and rerun the full checks. The December 2025 advisory lists 15.1.11 for its fixes; do not treat that historical version as a complete current security baseline. [Official Next.js advisory](https://nextjs.org/blog/security-update-2025-12-11). |
| P1 | **Web cannot pass its release checks.** `apps/web/app/api/messages/route.ts:38` uses `application.campaign` without including it in the query. `apps/web/components/messaging/inbox.tsx:8` imports a nonexistent date utility. Build and typecheck reproduced the errors. | Include the required relation, implement or replace the utility, and resolve lint errors before adding features. |
| P1 | **Public discovery is accidentally protected.** `apps/web/middleware.ts:4–8` applies `startsWith('/creator')` to `/creators` and profile URLs. Browser search redirected to sign-in. Only the pathname is retained in `callbackUrl`, losing the selected filters. | Match path-segment boundaries: exact prefix or prefix plus `/`. Keep public browse/profile routes public and preserve pathname plus search parameters. |
| P1 | **Acceptance/rejection saves invalid states and permits duplicate contracts.** `apps/web/app/api/applications/[id]/route.ts:46` stores `accept`/`reject`, but guards and screens expect `accepted`/`rejected`. Two sequential accepts created two contracts in the probe. | Use explicit action-to-status mapping, transactional conditional transitions, and a unique relationship from the application to its contract. Create the contract and milestone in the same transaction. |
| P1 | **Messaging has incompatible thread identities.** The route and inbox use application IDs; `Message.threadId` references a Contract in the Prisma schema. Even after fixing the missing relation, a normal application ID cannot satisfy that contract foreign key. There are no `/messages` page routes; the browser confirmed 404. | Model a conversation with authorized participants and optional application/contract references. Add inbox and conversation routes, retrieval, sending, and participant tests. |
| P1 | **Primary user actions are unavailable.** Header Sign in and Get started are plain buttons without handlers. Brand application Message, Shortlist, and Accept controls are disabled in `apps/web/app/brand/campaigns/[id]/page.tsx`. | Connect navigation and mutation actions, with pending, success, and failure states. Show a clear preview limitation for unfinished actions. |
| P1 | **Production OTP delivery is missing.** `apps/web/app/api/otp/send/route.ts` creates and logs the code but never sends an SMS. It returns success in production, where the development code is omitted from the response. | Implement and verify actual delivery; return a delivery failure when appropriate. Never log live OTPs. Validate normalized Pakistani phone numbers rather than only length. |
| P1 | **Saving a profile destroys social connections.** `apps/web/app/api/onboarding/creator/route.ts:93–105` deletes all social rows and recreates them without OAuth tokens, external IDs, expiry, or connection provenance. The wizard also writes a hardcoded 3.5% engagement rate. Sending no accounts leaves old rows intact. | Separate editable profile fields from provider-owned connection data. Update by stable identity; explicitly disconnect selected accounts; preserve tokens and measured statistics. Make related writes transactional. |
| P1 | **Social connection/sync can present fabricated freshness.** Missing provider credentials trigger mock connections without a production guard. Real YouTube connection records use `pending_real_fetch`; sync updates timestamps for all selected accounts without fetching metrics. | Require explicit development-only mock mode. Fail closed on missing production configuration. Fetch account identity and metrics, track attempt versus successful-sync time, and surface stale/failed states. |
| P2 | **Homepage niche search uses incompatible values.** Hero and niche links submit `lifestyle`, `health`, etc.; onboarding stores `Lifestyle`, `Health & Wellness`, etc. Browse performs exact comparisons. | Share canonical niche IDs and display labels across forms, URLs, storage, and filtering. Test every landing-page niche against a matching profile. |
| P2 | **Discovery prices and sorting are inaccurate.** `apps/web/app/creators/page.tsx:103–116` derives a starting rate from followers rather than RateCard; Newest returns zero for every comparison. Engagement also averages missing values as zero. | Read real rates and creation timestamps; distinguish unknown measurements from zero. Define whether follower filtering refers to the selected platform or combined accounts. |
| P2 | **Profile actions do not preserve their intended target.** Profile Message links to a missing generic inbox; Invite links to a blank campaign form without creator context. Sync is shown to all viewers although the endpoint syncs the signed-in creator's own accounts. | Restrict sync to the owner. Carry the selected creator into an invitation flow and open the relevant conversation. |
| P2 | **Marketplace claims are demo content presented as live facts.** Featured creators and totals come from `lib/mock-data.ts`; homepage copy claims verified creators, payouts, escrow, and delivery times beyond the implemented workflow. Numeric demo profile links use `/creators/1`, etc., while detail pages query real users. | Clearly label the preview, use real records for clickable profiles and counts, and publish only operationally supported claims. Missing demo profile IDs were identified in the code path, not verified against every database record. |

## Design improvements

**Keep the core identity.** The restrained white background, dark buttons, gradient accents, and burst mark fit the product. A complete rebrand would add little value at this stage. Improve trust, hierarchy, and continuity first.

1. **Make the first screen useful sooner.** The large desktop headline wraps across several lines and pushes search toward the bottom of the viewport. Reduce its scale slightly, shorten the introductory paragraph, and bring search higher. On mobile, prioritize search over three stacked decorative creator cards.
2. **Give both audiences a clear entry.** Use “Find creators” and “Join as a creator” with a visible sign-in path. Restore navigation on mobile through a compact menu. The current mobile header keeps only the inert Get started button.
3. **Replace repeated initials with meaningful portfolio content.** Real creator photos and one representative work sample help buyers assess style. Obtain the appropriate assets and optimize their delivery. Keep initials as the loading or missing-image fallback.
4. **Make creator cards honest and comparable.** Prioritize name, city, niche, principal platform, actual starting price, availability, and verification explanation. Show measurement provenance and freshness. Combined followers should not imply a deduplicated audience.
5. **Simplify mobile filtering.** Put results first and offer a Filters button, selected-filter chips, clear-all, and a result count. The current source places the entire filter panel above results on smaller screens. Preserve selections through Back/Forward navigation; checkbox state currently initializes only once from URL props.
6. **Improve accessible forms and contrast.** Browser inspection found all three homepage selects without programmatic labels. Associate labels with controls, announce errors, expose selected niche state, and avoid links containing nested buttons. White text over the cyan end of the gradient needs particular review. Normal text generally needs 4.5:1 contrast; this was not a complete contrast audit. [W3C guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
7. **Deliver the intended typography.** CSS names Inter and Space Grotesk but the app does not load them. Bundle or explicitly load the chosen fonts; then recheck wrapping and layout stability. Increase tiny uppercase metadata where it carries decision-making information.
8. **Add continuity after sign-in.** Use shared navigation across discovery, campaigns, applications, and messages. Save onboarding progress before an OAuth redirect so creators do not lose unsaved edits. Replace placeholder policy and pricing links with useful destinations or remove the links until ready.

## Features worth building

These are proposed priorities, not claims that all are absent from PLAN.md. Several already appear in the plan; the recommendation is to narrow the implementation order around successful collaborations.

| Order | Feature | Why it matters | Acceptance signal |
|---|---|---|---|
| First | Finish one complete hiring journey | A brand must be able to review, shortlist, discuss, and accept an application | One creator and one brand can complete the journey with consistent states and no manual database edits |
| Next | Saved shortlists and creator comparison | Helps brands choose without repeatedly searching | Save creators to a campaign; compare actual rates, niches, platforms, and availability |
| Next | Campaign drafts, templates, and creator invitations | Reduces effort to publish a useful brief | Resume a draft; include deliverables, budget, deadline, and selected invitees |
| Next | Notification center with read state | Prevents proposals and decisions being missed | A recipient sees a reliable notification once and can reach the relevant record |
| Next | Profile completeness and connection health | Improves marketplace supply and data trust | Creators see exactly which fields or connections need attention |
| Later | Delivery workspace with revisions and approval | Connects agreement to actual work | Track each deliverable, due date, submission, revision, and approval |
| Later | Explainable matching and saved searches | Makes recommendations actionable | Show reasons such as niche, city, platform, budget, and availability match |
| Before real payments | Administrative verification and dispute tools | Enables support staff to resolve exceptions | Authorized review decisions have an audit trail; participants can report an issue |
| After a stable web journey | Urdu localization and mobile parity | Extends usability without multiplying unfinished flows | Core flows work with localized copy and RTL layout; native app supports real actions |

Measure the funnel from browse → profile → shortlist/invite → application → acceptance → completed collaboration. Track completion and failure rates rather than decorative creator totals. Avoid starting an AI content studio or broad social feed before the collaboration workflow works.

## Architecture and delivery improvements

**Use a modular monolith.** Keep one deployable backend for now, with clear modules for identity, profiles, campaigns, conversations, and payments. Introduce service functions for business transitions so routes handle transport and validation while services enforce ownership, status changes, and transactions.

**Establish one source of truth for domain values.** Put niche/platform IDs, role types, validation schemas, and API response contracts in real shared packages. Currently only the config package exists even though the README describes shared UI and types. Share tokens and domain logic between web and mobile; choose platform-specific UI where it improves usability.

**Move database filtering and pagination into the query layer.** Discovery currently loads every creator with whole user and social rows, including fields it does not need, then filters and sorts in memory. Select public fields explicitly, add stable cursor pagination, and index the actual query patterns. The inbox also has two extra queries per application; aggregate or batch them and sort by message activity.

**Make persistence predictable.** Use a versioned migration workflow for the intended production database rather than relying on `db push` or merely changing the provider string. Define enum/status constraints, stable IDs, and relational or validated JSON data. Run integration tests against that database. SQLite remains useful for local work but is not a production migration strategy.

**Separate edge-safe authentication configuration from database-dependent code.** The production compilation warned that Prisma introduces a Node API into Edge middleware. Keep middleware lightweight, perform authoritative access checks server-side, and use the split-configuration pattern where applicable. [Auth.js guidance](https://authjs.dev/guides/edge-compatibility).

**Treat social integrations as background work.** Add bounded retries, token refresh, provider-specific adapters, refresh deduplication, quotas, and separate successful-sync timestamps. Protect tokens at rest and exclude them from public projections. Do not report success merely because a job was requested.

**Design payment accounting before activating payments.** The schema labels Transaction as double-entry, but there are no ledger accounts or balanced journal entries. Define those invariants, immutable entries, provider-event idempotency, reconciliation, and audit history before accepting funds. Existing payment models are a starting point, not an operational escrow system.

**Add release gates and operational evidence.** Run lint, types, production build, focused security/state tests, and one isolated end-to-end collaboration journey in CI. Add structured errors with request IDs, scrubbed logs, health checks, backup/restore verification, and failed-job visibility. Pin the package-manager version consistently: README's `pnpm@latest` conflicts with package.json's 9.15.0. Document the actual implementation phase and keep local database files out of version control if they contain user data.

## Recommended implementation sequence

1. Fix role authorization, OTP behavior, and framework security updates. Pass web build, types, and lint.
2. Repair public browse, canonical filters, real pricing, and landing navigation. Label demo data.
3. Implement conversation identity and messaging, valid acceptance transitions, and transaction safety. Enable the hiring controls.
4. Preserve social connection data, implement genuine sync, and improve onboarding continuity.
5. Run the complete creator/brand journey against an isolated database, including unauthorized access, retries, concurrency, error recovery, and mobile layouts.
6. Add shortlists, invitations, drafts, and notifications. Activate payments only after delivery, accounting, and support workflows are verified.

The best immediate investment is a trustworthy, complete collaboration journey. Visual polish and discovery features will have more value once users can finish the work they came to do.

## Reproduction commands

Run these from `apps/web` using the installed dependencies:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\next.cmd lint
.\node_modules\.bin\next.cmd build
node qa-regressions.cjs
```

The last command intentionally fails while the identified defects remain. It uses no real user records and sends no external requests. Run production builds separately from a development server sharing the same `.next` directory.
