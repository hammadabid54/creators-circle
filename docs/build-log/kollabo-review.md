# Kollabo — Product & Engineering Review

**Reviewed against:** `kollabo-app-reference.docx` (2026-09-11, current working tree)
**Scope:** correctness issues found in the reference, architecture and data-model improvements, security/compliance, product gaps, and new feature specifications with implementation detail.

---

## 1. Where Kollabo actually stands

**What is genuinely strong:**

- The contract framework is better than most marketplaces at this stage. Two-step sign-off, viewer-aware status labels, milestone-level revision cycles, and an auditable `ContentSubmission → DeliveryReview` chain is a mature design that a lot of funded competitors don't have.
- The double-entry `Transaction` ledger with idempotency keys is the right call. Most teams ship a `paid` boolean and regret it eighteen months later.
- The discovery layer — `DiscoveryTaxon` with aliases, `interpretQuery`, `DiscoveryPage` with a `MIN_INDEXABLE_CREATORS` thin-content guard — is a real programmatic-SEO engine, not a search box. That's the cheapest acquisition channel available in this market and it's already built.
- The QA harness is unusual but sound. Tests like *"Concurrent OTP has one winner"*, *"Production never allows mock mode"*, and *"Failed sync never advances successful-sync time"* show someone was thinking about the failure modes that actually bite.
- OTP handling (HMAC-at-rest, conditional-increment concurrency, fail-closed in prod) is above average.

**The single biggest risk, stated plainly:**

Kollabo is a marketplace that cannot take money. Everything downstream of that — take rate, retention, dispute leverage, the reason a brand and creator stay on-platform instead of moving to WhatsApp after the first message — depends on escrow existing. Section 30 lists "Payment provider" as one gap among eight. It isn't one of eight. It is the product. Every other item on the roadmap is worth less until money moves through the contract.

The second biggest risk is **disintermediation**, and it's currently unmitigated. A brand posts a campaign, sees an applicant, exchanges two messages, and there is nothing in the system that makes completing the deal on Kollabo better than completing it on WhatsApp with a bank transfer. Escrow, verified metrics, and reviews are the three things that fix this, and none of them are live.

---

## 2. Correctness issues, contradictions, and likely bugs

These are things I'd verify against the code before anything else. Each cites the section of the reference it came from.

### 2.1 The ranking formula has a dead term (§10.5)

```
score = readiness
      + 15 * available
      + 10 * fresh
      + 5 * engagement
      + 8 ← constant, applies to every row
      + 12 * min(brands, 5) / 5
```

The bare `+ 8` is added to every creator identically. It shifts the whole distribution and changes nothing about ordering. Either a coefficient lost its variable during an edit (a `verified` or `hasRateCard` term is the likely candidate given `readiness` is described as fed by bio length and rate-card presence) or it's leftover. Worth grepping — a silently-dropped signal is a ranking bug that no test would catch.

Second issue with the same formula: `15 * available` is the largest single term. Availability is a self-declared boolean that costs a creator nothing to set and never expires. It will be permanently `true` for everyone within a month of launch, at which point it's a second dead term. Either decay it (auto-flip to unavailable after 30 days without a login) or weight it far lower.

### 2.2 `escrowState` is a second source of truth for money (§6.5, §20)

`Contract.escrowState` (`pending | funded | held | released | refunded`) and the `Transaction` ledger will describe the same reality. The moment a provider is wired, they will disagree — a webhook lands, the ledger row writes, the contract field doesn't, and now the UI says "funded" while the ledger says otherwise.

**Fix before payments ship:** make `escrowState` a derived read, computed from the ledger, not a stored column. If you keep the column for query performance, treat it strictly as a projection updated inside the same transaction as the ledger write, never independently, and add a reconciliation job that asserts they match.

### 2.3 Dispute behaviour is described two different ways (§16.1 vs §19)

§16.1 says opening a `Dispute` sets `Contract.status = 'disputed'` and has "the same effect as cancelled for the workflow."
§19 says *"Opening a dispute does not by itself change the contract status."*

These can't both be true. The second is the better behaviour — a creator shouldn't be able to freeze an active contract unilaterally by filing — but the ambiguity means whichever gets implemented will surprise someone. Decide, document it in one place, and add a QA case.

### 2.4 Contract completion isn't safe once money exists (§17)

*"If every milestone in the contract is approved, the contract status flips to 'completed'."*

Today that's harmless — the QA suite even asserts approvals don't touch transactions. Once escrow is wired, auto-completion on last approval means the contract closes before funds are released, and there's a window where a completed contract has unreleased escrow. Completion needs to be gated on `escrow_release` succeeding, or you need an explicit `pending_payout` state between `active` and `completed`.

### 2.5 Milestone amounts aren't reconciled against the agreed rate (§6.5)

`Milestone.amount` is per-milestone; `Contract.agreedRate` is the total. Nothing described enforces `SUM(milestone.amount) == agreedRate`. With escrow, a mismatch means you either over-release or strand funds. Add a DB-level check or a validated invariant on every milestone write.

### 2.6 `Contract.deliverables` duplicates `Milestone` (§6.5)

Both describe what's owed. `Contract.deliverables` is a JSON blob seeded from the proposal; milestones are the live workflow objects. Two representations of the same thing drift. Recommendation: keep `deliverables` on `Campaign` and `Application` (they're proposals), and make `Milestone` the only representation on a `Contract`. Snapshot the originating proposal into an immutable `Contract.termsSnapshot` for dispute evidence, and never read it for workflow.

### 2.7 JWT sessions make bans and role changes unenforceable for 30 days (§7)

Session strategy is JWT, `maxAge` is 30 days, and `role` is copied onto the token at sign-in. Consequences:

- Banning a user does not sign them out. Their token remains valid until expiry.
- If you ever allow a role change (see §3.3 below), it won't take effect until re-login.
- A KYC rejection or an account suspension has no immediate teeth.

**Fix:** add `User.sessionVersion Int @default(0)`. Stamp it into the JWT at sign-in. In the `jwt` callback (or a lightweight middleware check against a Redis/KV set of revoked user IDs), compare and force re-auth on mismatch. Bumping `sessionVersion` becomes your instant global logout for that user. Keep the check off the Prisma path in Edge middleware — use KV so `auth.config.ts` stays Edge-safe.

### 2.8 The `ids` filter is an unbounded query vector (§10.2)

```
ids: string max 10000 (comma-separated)
```

10,000 characters of comma-separated cuids is roughly 400 IDs, and it goes into what is presumably a SQL `IN (...)`. On Postgres that's a planner problem, and it's an unauthenticated public endpoint. Cap it at 100 IDs after parsing and reject beyond that with a 400 rather than truncating silently.

### 2.9 Polymorphic `threadId` resolves against two tables with no FK (§6.5, §15)

*"try Contract first by id, then Application by id."*

Three problems: no referential integrity (a deleted contract orphans its messages), two queries per message send, and the fallback ordering means a `threadId` that happens to match a Contract the caller can't access returns 403 rather than falling through to a valid Application. Cuid collisions are vanishingly unlikely, but the shape is fragile.

**Fix:** introduce a real `Thread` model. See §3.1.

### 2.10 Rate limiting exists only for OTP (§7)

OTP has 3/hour/phone and a 60s cooldown. Nothing else described has limits. Unprotected surfaces that matter:

- `POST /api/applications` — a creator can spam every open campaign
- `POST /api/messages` — 2000 chars, unlimited volume
- `POST /api/campaigns` — brand-side spam
- `GET /api/search/suggest` — public, does fuzzy taxonomy matching per keystroke
- `GET /discover` — public, runs a CTE-based ranking query

Also note: OTP limits are per-phone, not per-IP. An attacker rotating numbers can burn your Twilio balance freely. **SMS pumping fraud** is an active and expensive attack; Pakistan-origin traffic to premium ranges is a known vector. Add a country allowlist (PK only, given `/^03\d{9}$/` already implies it), per-IP velocity limits, and a daily spend circuit breaker.

### 2.11 `prisma db push` is described as the production migration path (§29)

*"no migration is required beyond running prisma db push against the new database."*

`db push` is a schema-sync tool for prototyping. On a live Postgres database it will happily drop columns and lose data to reconcile a diff, with no versioned history and no rollback. Before the first real user record exists, switch to `prisma migrate dev` locally and `prisma migrate deploy` in CI. The one-time cost is baselining the current schema as migration `0_init`.

### 2.12 Application status `invited` has no described flow (§6.4)

The enum supports it; nothing in §12 or §14 creates it. Brands can't proactively invite a creator they found in Discover — they can only wait for inbound applications. That's a significant liquidity gap on a two-sided marketplace where the brand side is usually the one with intent. See §5.1.

### 2.13 Minor

- `Message` has no `readAt` / `deliveredAt`. No unread counts, no read receipts, no "they've seen it" — all table stakes for a messaging product.
- `Review` is unique on `(contractId, reviewerId)` but nothing described requires the contract to be `completed`. Enforce it, or a brand can review after one bad message.
- `CreatorProfile.responseRate` and `avgRating` are described as "filled in by the QA suite's metric history test path" — i.e. not computed from production data. They're currently decorative but rendered as if real.
- `Audience.authenticityScore` exists and is unused. It's the most valuable unused field in the schema (§5.2).
- `User.lang` exists with no i18n implementation described (§4.6).
- `BrandProfile` has no `slug`, so §9 notes the public brand page uses the company name in the URL. That breaks on rename and on duplicate company names. Add the slug column now; it's the same backfill pattern already used for `CreatorProfile`.

---

## 3. Architecture and data model improvements

### 3.1 Replace the polymorphic thread with a real `Thread` model

```prisma
model Thread {
  id String @id @default(cuid())
  kind String // "application" | "contract" | "direct"
  applicationId String? @unique
  contractId String? @unique
  brandUserId String
  creatorUserId String
  lastMessageAt DateTime?
  createdAt DateTime @default(now())

  application Application? @relation(fields: [applicationId], references: [id])
  contract Contract? @relation(fields: [contractId], references: [id])
  messages Message[]
  participants ThreadParticipant[]

  @@index([brandUserId, lastMessageAt])
  @@index([creatorUserId, lastMessageAt])
}

model ThreadParticipant {
  threadId String
  userId String
  lastReadAt DateTime?
  muted Boolean @default(false)

  @@id([threadId, userId])
  @@index([userId, lastReadAt])
}
```

What this buys you:

- Referential integrity, one lookup instead of two, and a proper `403` vs `404` distinction.
- `lastMessageAt` denormalised on the thread means the inbox is a single indexed query instead of "pull the latest message per thread."
- `ThreadParticipant.lastReadAt` gives you unread counts for free — the badge on the sidebar that drives daily return visits.
- A `direct` kind unlocks brand→creator outreach before any application exists (§5.1).
- Migration path: an application thread and its contract thread should **merge**, not fork. When a contract is created from an application, set `contractId` on the *existing* thread and flip `kind`. The conversation history carries forward, which is exactly what both parties expect and is a small delight.

### 3.2 Introduce Organizations, and stop putting roles on `User`

Right now `BrandProfile` is 1:1 with `User` and `User.role` is immutable. Both assumptions break on contact with reality:

- A brand's marketing manager leaves. The account is now unrecoverable, or shared via a password.
- Agencies manage 5–20 brands. They need one login and many workspaces.
- Bigger brands need a junior who can shortlist but not approve payments.
- The creator who also runs a small clothing label genuinely needs both roles.

```prisma
model Organization {
  id String @id @default(cuid())
  kind String // "brand" | "agency"
  name String
  slug String @unique
  createdAt DateTime @default(now())

  memberships Membership[]
  brandProfile BrandProfile?
  campaigns Campaign[]
}

model Membership {
  id String @id @default(cuid())
  orgId String
  userId String
  role String // "owner" | "admin" | "member" | "finance" | "viewer"
  invitedByUserId String?
  acceptedAt DateTime?

  @@unique([orgId, userId])
  @@index([userId])
}
```

`User.role` becomes an account *type* (`creator` | `brand_side` | `admin`) rather than an immutable identity. Authorisation moves from "is this user a brand" to "does this user hold a membership on the org that owns this campaign, with sufficient role." That's a meaningful refactor, but it gets exponentially more expensive after you have paying customers, and it's a prerequisite for agency business — which in Pakistan is where the larger budgets actually sit.

**Permission matrix to implement:**

| Action | owner | admin | member | finance | viewer |
|---|---|---|---|---|---|
| Create/edit campaign | ✓ | ✓ | ✓ | | |
| Shortlist / reject applicant | ✓ | ✓ | ✓ | | |
| Accept applicant (creates contract) | ✓ | ✓ | | | |
| Fund escrow / release payment | ✓ | | | ✓ | |
| Invite/remove members | ✓ | ✓ | | | |
| View contracts & messages | ✓ | ✓ | ✓ | ✓ | ✓ |
| Open dispute | ✓ | ✓ | | ✓ | |

### 3.3 Make role choice reversible-with-friction, not immutable

The QA test *"New email accounts select one role and cannot change it"* enforces a rule that will generate support tickets from day one — people mistap. Better model: role is set once by the picker, but a user can **add** the other side (a creator can create a brand org) rather than switch. Under the Organization model above this falls out naturally: creating an org gives you brand-side access without touching your creator identity.

### 3.4 Plan the Postgres migration properly

The reference says the same schema runs unchanged on both, which is true but leaves real performance on the table. When you cut over:

| Today (SQLite-compatible) | On Postgres |
|---|---|
| Status fields as `String` | Native `enum` types — free validation, smaller storage, index-friendly |
| `niches`, `languages`, `aliases`, `fileUrls`, `targetNiches` as JSON strings | `String[]` native arrays or `Jsonb` with **GIN indexes** |
| Free-text `q` filter (presumably `LIKE`) | `tsvector` full-text column + `pg_trgm` for fuzzy/typo matching |
| Ranking CTE recomputed per request | Materialised view refreshed every 5–15 min, or a cached `creator_rank_score` column |

The JSON-string arrays are the urgent one. `targetNiches` and `niches` are filtered on constantly. Stored as JSON text, every filter is a full scan with string matching. As `String[]` with a GIN index, `niches && ARRAY['fashion']` is an index seek. At 500 creators nobody notices; at 20,000 the Discover page times out.

Also add, at minimum:

```sql
CREATE INDEX ON "Application" ("campaignId", "status");
CREATE INDEX ON "Application" ("creatorId", "createdAt" DESC);
CREATE INDEX ON "Contract" ("creatorId", "status");
CREATE INDEX ON "Contract" ("brandId", "status");
CREATE INDEX ON "Message" ("threadId", "createdAt" DESC);
CREATE INDEX ON "Transaction" ("contractId", "type", "status");
CREATE INDEX ON "CreatorMetricSnapshot" ("socialAccountId", "observedAt" DESC);
```

### 3.5 Add a file storage layer — it's a missing primitive

Portfolio items, brand logos, CNIC front/back, selfies, and work deliverables are all "a URL" today with no described origin. That means either users paste external links (fragile, hotlink-prone, and unacceptable for CNIC images) or there's an undocumented upload path.

**Recommendation:** Cloudflare R2 or S3 with presigned uploads.

- `POST /api/uploads/sign` → returns a presigned PUT URL, scoped by `userId` and purpose (`portfolio` | `deliverable` | `kyc` | `logo`), with a content-type allowlist and a size cap.
- Separate buckets by sensitivity. **KYC images must live in a private bucket with server-side encryption, no public URLs ever, and access only through a short-TTL signed read issued to an authenticated admin.** Log every read.
- Run uploads through an image pipeline: strip EXIF (creators' photos carry GPS), generate WebP derivatives at 3 widths, and cap originals.
- Virus-scan deliverable uploads (ClamAV in a worker, or Cloudflare's scanning) before they're readable by the counterparty.

### 3.6 Add a `Notification` model and an outbox

There is no notification system at all. Email and SMS exist purely for OTP. On a marketplace, the things that drive return visits are all notifications: *your application was shortlisted, your contract is ready to sign, a milestone is due tomorrow, you received a message, payment released.*

```prisma
model Notification {
  id String @id @default(cuid())
  userId String
  type String // "application.shortlisted", "contract.ready_to_sign", ...
  payload Json
  readAt DateTime?
  createdAt DateTime @default(now())

  @@index([userId, readAt, createdAt])
}

model NotificationDelivery {
  id String @id @default(cuid())
  notificationId String
  channel String // "inapp" | "email" | "sms" | "whatsapp" | "push"
  status String // "queued" | "sent" | "delivered" | "failed" | "suppressed"
  providerRef String?
  attempts Int @default(0)
  sendAfter DateTime @default(now())
  createdAt DateTime @default(now())

  @@index([status, sendAfter])
}

model NotificationPreference {
  userId String
  type String
  channel String
  enabled Boolean @default(true)

  @@id([userId, type, channel])
}
```

Use the **transactional outbox pattern**: writing a notification happens inside the same DB transaction as the business event, and a worker drains `NotificationDelivery` rows. That way "contract signed" and "notify the brand" can't diverge, and a Resend outage doesn't roll back a contract.

### 3.7 Add an audit log

A system with money, disputes, and KYC needs an immutable record of who did what.

```prisma
model AuditEvent {
  id String @id @default(cuid())
  actorId String?
  actorType String // "user" | "admin" | "system" | "webhook"
  action String // "contract.signed", "kyc.approved", "escrow.released"
  entityType String
  entityId String
  before Json?
  after Json?
  ip String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([entityType, entityId, createdAt])
  @@index([actorId, createdAt])
}
```

Append-only, never updated, never deleted. When a dispute reaches "she says she approved it, he says she didn't," this is the only thing that resolves it. It's also what a payment partner or auditor will ask for.

### 3.8 Testing: keep the harness, add the missing layers

The `vm`-based runner is fast and exercises real route code, which is genuinely valuable — don't throw it away. But it has real costs: a new engineer can't read it, mocking is bespoke per test, and it can't test anything rendered.

Layer on top of it:

- **Vitest** for `lib/` — `contracts.ts` (deadline math, `daysUntil`, `deadlineBucket`, PKR formatting), `slug.ts`, `discovery-taxonomy.ts` (`interpretQuery` is exactly the kind of parser that deserves 40 table-driven cases), `creator-ranking.ts`. These are pure functions and should be trivially unit-testable.
- **Playwright** for 4–5 critical journeys: sign up → pick role → complete onboarding → appear in Discover; post campaign → apply → accept → sign → submit → approve → complete; and the payment flow once it exists.
- **CI** on every PR: `typecheck`, `lint`, `vitest`, `qa-regressions`, `qa-discovery`, Playwright on a seeded DB. The reference mentions no CI at all.
- **Contract tests against provider sandboxes** for JazzCash/EasyPaisa once wired — record-and-replay their webhook payloads, because their sandboxes are unreliable and their docs are incomplete.
- Fix `seed-contracts.js` idempotency (§28 notes re-running duplicates milestones) so it can be a CI fixture.

---

## 4. Security, privacy, and compliance

### 4.1 CNIC and selfie storage is the highest-liability thing in the system

`Verification` stores `cnicFront`, `cnicBack`, and `selfie` as URLs. A CNIC image contains full name, father's name, CNIC number, date of birth, address, and a photograph — everything needed for identity fraud, and CNIC-based fraud is an active problem in Pakistan.

Pakistan still has no enacted comprehensive data protection statute. As of March 2026, Pakistan had not enacted specific data protection legislation; the Prevention of Electronic Crimes Act 2016 serves a broadly similar purpose and sets out penal sanctions against misuse of personal information, with an amendment passed in 2025. The Personal Data Protection Bill 2023 completed consultation but has not been passed by both houses of Parliament; its framework largely mirrors the EU GDPR. The practical implication is not "we're safe" — it's that organisations should align with the draft Bill's principles and with GDPR-style international best practice now, both for actual protection and for readiness when the law is enacted. Note also that the draft Bill, in its current form, would require critical personal data to be processed on infrastructure inside Pakistan — worth tracking, because it has direct implications for a Vercel + US-region-Postgres deployment.

**Concrete requirements to implement before real KYC volume:**

1. Private bucket, server-side encryption, **no publicly-resolvable URL ever**. Store an object key in the DB, not a URL.
2. Admin reads issue a signed URL with a TTL under 5 minutes, and every issuance writes an `AuditEvent`.
3. Encrypt the CNIC *number* at the application layer (envelope encryption via KMS) if you store it at all, and store a searchable HMAC for dedupe rather than the plaintext.
4. **Retention policy**: delete raw CNIC and selfie images once verification is approved, retaining only `{verified: true, method, verifiedAt, last4OfCnic, reviewerId}`. There is no business reason to keep the images, and every day you do is unpriced liability.
5. Add a Data Subject Request path: export and delete. Under the Organization model, deletion needs to be a soft-anonymise for users with financial history (ledger rows must survive), which is exactly why you want to design it before you need it.

### 4.2 A verification pipeline that actually verifies

Manual selfie-vs-CNIC eyeballing by an admin does not scale past ~50 reviews/week and isn't reliable. Two upgrades:

- **NADRA Verisys / Biometric Verisys** through an authorised intermediary. This checks the CNIC against the national database and returns a name/DOB match. It costs a small per-check fee and converts your verification from "someone looked at a picture" into a genuine trust signal you can charge for.
- **Liveness detection** on the selfie step (an open-source or vendor SDK) to stop the trivial attack of uploading a photo of a photo.

Sequence: liveness selfie → CNIC OCR → NADRA Verisys name/DOB match → auto-approve on match, queue for human review on mismatch. This drops manual review to the exception path.

### 4.3 Other security items

| Item | Issue | Fix |
|---|---|---|
| Session revocation | JWT valid 30 days; bans don't take effect | `sessionVersion` + KV check (§2.7) |
| API rate limiting | Only OTP is limited | Upstash Redis sliding window on every mutating route; per-IP + per-user |
| SMS pumping | Per-phone limits only | Country allowlist, per-IP velocity, daily spend circuit breaker |
| OAuth tokens | `accessToken`/`refreshToken` stored plaintext on `SocialAccount` | Encrypt at rest with a KMS-managed key; these tokens grant read access to users' social accounts |
| Webhook security | Not yet applicable, but will be | HMAC signature verification + replay-window rejection + raw-body capture before parsing, for every payment webhook |
| CSP / security headers | Not mentioned | `next.config` headers: CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Message content | 2000 chars, rendered | Sanitise on render; strip `javascript:` and data URIs the same way delivery links already are (§17 does this correctly — apply it consistently) |
| Admin access | `requireAdmin` on role string | Require 2FA for admin accounts; admin actions are the ones that move money and approve identity |
| Dependency risk | NextAuth v5 **beta** in production | Pin exactly, subscribe to advisories, and plan the GA upgrade — a beta auth library is an accepted risk that should be a tracked one |

### 4.4 Tax and invoicing obligations you will inherit with payments

The moment Kollabo intermediates payment, it acquires responsibilities it doesn't have today. This is not optional and it's better designed in than bolted on:

- **Withholding tax on services** (Income Tax Ordinance s.153) applies when a brand pays a creator for services. Rates differ for filers vs non-filers, and non-filer rates are substantially higher. Brands need a WHT certificate for their own filing.
- **Provincial sales tax on services** — advertising and related services are taxable under PRA (Punjab), SRB (Sindh), KPRA, and BRA, with different rates and rules per province. Which province applies depends on where the service is rendered/consumed.
- **NTN** is already captured on `BrandProfile` — good instinct. You'll want it on the creator side too (creators with an NTN are filers and face lower WHT), plus an FBR filer-status check.

Turning this from a burden into a feature is one of the strongest differentiators available (see §6.9).

---

## 5. Improvements to what already exists

### 5.1 Brand-initiated outreach (`invited` flow)

The `invited` status already exists in the `Application` enum with no flow behind it (§2.12). This is the single highest-leverage unbuilt feature in the existing model, because brand intent is the scarce resource.

**Build:** on any creator card in Discover and on `/creators/[slug]`, an "Invite to campaign" action for signed-in brand users. It opens a picker of the brand's open campaigns, optionally attaches a message, and creates an `Application` with `status='invited'`, `creatorId`, `campaignId`, and no `proposedRate`. The creator sees it in `/creator/applications` under an "Invitations" section, and can accept (which prompts them to fill in `proposedRate` and flips status to `pending`) or decline (`withdrawn`).

**Also build:** a Shortlist. Brands browsing Discover should be able to save creators to a named list before committing to invites. The `saved: '1'` filter already exists in `filterSchema` (§10.2), implying a saved-creators concept is half-built — finish it as a first-class `CreatorList` model so brands can build a media plan across sessions and share it with a client.

### 5.2 Turn `authenticityScore` on — this is the moat

`Audience.authenticityScore` exists and is unused. Fake followers and engagement pods are endemic in Pakistani creator marketing, and the number one complaint from brands hiring creators is that they paid for reach that didn't exist. A platform that can credibly say *"this creator's audience is 87% authentic and here's why"* has a defensible reason to exist.

You already have the raw material: `CreatorMetricSnapshot` is a versioned, additive time series keyed on `(socialAccountId, observedAt)`. Score from signals derivable from OAuth-verified data:

| Signal | What it catches | Data needed |
|---|---|---|
| Follower growth anomalies | Bought follower spikes | Snapshot time series — **you already collect this** |
| Engagement-to-follower ratio vs. peer band | Inflated follower counts | Snapshots + peer percentile (ranking code already computes percentiles) |
| Comment-to-like ratio | Pod activity (pods like, rarely comment naturally) | Per-post metrics via API |
| Engagement variance across posts | Bot engagement is unnaturally consistent | Per-post metrics |
| Audience geography vs. creator's stated market | Purchased overseas followers | Audience insights API |
| Reach-to-follower ratio | Shadowbanned or inactive audience | Insights API |

Present it as a **band, not a number** — "Strong / Typical / Needs review" with the two or three signals that drove it. A precise 87.3% invites arguments you can't win; a band with reasons builds trust. Recompute nightly, store as a `CreatorTrustSnapshot`, and never show a score for a creator with fewer than 3 metric snapshots (say "not enough history yet" instead).

**Critically:** this only works on OAuth-connected accounts. It gives creators a concrete reason to connect their accounts — which is your data moat — and gives you a reason to charge brands for "verified metrics only" filtering.

### 5.3 Fix the metrics coverage gap: Instagram is the market

YouTube is the only live sync (§21), but Instagram is where Pakistani creator commerce actually happens. This is a real prioritisation inversion.

The reason Instagram is hard is worth naming, because it shapes onboarding: the Instagram Graph API requires the creator to have a **Business or Creator account linked to a Facebook Page**, and reading insights requires `instagram_manage_insights` plus Meta App Review. A large share of Pakistani creators are on personal accounts and don't have a Page.

**Design for this, don't fight it:**
- Add a guided "Convert to a Creator account" walkthrough inside onboarding, with screenshots. It's a 90-second flow most creators have never been shown.
- Show the payoff explicitly: verified badge, authenticity score, higher ranking, eligibility for brand-verified campaigns.
- Start the Meta App Review process now — it takes weeks and requires a screencast of the exact flow. It is a long-lead dependency and there is no way to compress it.
- In the interim, offer **screenshot-based insights upload** as a lower-trust fallback, clearly badged as unverified so it never competes with connected accounts in ranking.

TikTok's Display API gives follower and basic stats; the richer research API is gated. Wire the basic one — it's much less work than Meta and TikTok is growing fast in Pakistan.

### 5.4 Onboarding completion is where the funnel leaks

The reference describes a multi-step creator wizard (name, city, niches, languages, bio, rate card, portfolio). Multi-step wizards on mid-range Android over 4G lose people. Specific improvements:

- **Persist per step, not on submit.** If step 4 of 7 is where someone's connection drops, they should return to step 4, not step 1. Save partial state server-side against the profile.
- **Make the first screen social connect, not a form.** Connecting Instagram can prefill name, handle, avatar, follower count, and bio — turning seven fields into a confirmation. Data you can fetch, you should never ask for.
- **Show progress and payoff together.** Not "Step 3 of 7" but "Profiles with a rate card get 3× more invites" attached to the rate card step. The dashboard already has a 4-item checklist (§13) — bring that framing into the wizard itself.
- **Let people finish later without penalty.** Publish the profile at 60% complete with a visible completeness meter rather than gating publication on 100%.
- **Rate card guidance.** Most creators genuinely don't know what to charge. Show a live "creators like you in Lahore with 50–100K followers charge PKR 18,000–35,000 per reel" band derived from your own `RateCard` data. This is a strong reason to complete the step and a genuinely useful thing that no competitor can offer without the data.

### 5.5 Ranking: fix cold start and add exploration

The current formula has no exploration term. A creator who joins today has zero completed collaborations, no synced metrics, and low readiness, so they rank at the bottom, get no impressions, get no work, and stay at the bottom. Every marketplace dies of this if it isn't addressed deliberately.

**Add:**
1. **New creator boost** — a decaying bonus for the first 30 days after profile completion, sized to place them mid-pack rather than at the top.
2. **Impression-starved boost** — a small bonus for profiles with fewer than N impressions in the last 7 days. Requires logging impressions (see §7).
3. **Epsilon-greedy exploration** — on 10% of result slots, insert a creator sampled from outside the top-ranked set. Log which slots were exploratory so you can measure whether exploration converts.
4. **Diversity constraint** — cap any single niche or city at ~40% of the first page on unfiltered queries, so Discover doesn't degenerate into the same twelve Lahore fashion creators.
5. **Decay the `available` flag** and reduce its weight (§2.1).
6. **Personalise for returning brands** — weight toward niches and cities they've hired in before.

Keep `rankingReasons()` exposed. Transparency about ranking is rare and builds trust, and the gaming risk is low when the underlying signals are OAuth-verified rather than self-declared.

### 5.6 Messaging needs to become a real product surface

Beyond the `Thread` refactor (§3.1), messaging is where deals live or leak:

- **Realtime**, or at least polling with unread badges. Pusher/Ably, or Postgres `LISTEN/NOTIFY` + SSE if you want to avoid a vendor.
- **Attachments** — moodboards, briefs, drafts. Requires the storage layer (§3.5).
- **Structured messages** in the thread: "Brand sent an offer: PKR 45,000 · 2 deliverables · [Accept] [Counter]". This pulls negotiation into the platform instead of leaving it as unstructured chat, which is what makes off-platform completion easy today.
- **Contact-info masking pre-contract.** Detect and redact phone numbers, emails, and WhatsApp links in messages on threads without an active contract, with an explicit "you can share contact details once a contract is signed" notice. Log attempts as a leakage signal. This is not user-hostile if paired with escrow, because on-platform completion is genuinely safer for both sides — but it is the single most effective anti-disintermediation lever available.
- **Canned replies and templates** for creators handling volume.

### 5.7 Smaller fixes worth doing

- **Compute `responseRate` for real** — median time-to-first-reply over the last 30 days, displayed as a band ("usually replies within 4 hours"). It's a strong brand-side signal and currently fabricated.
- **Add `Campaign.applicationDeadline` and auto-close.** Campaigns will otherwise sit `open` forever, creators will apply to dead listings, and Discover will fill with stale inventory. Auto-close after the deadline or 60 days of inactivity, and email the brand before you do.
- **Add campaign application caps.** Brands drown at 200 applicants; creators waste effort on a campaign with 200 applicants. Cap at a brand-set number and show applicant count on the card so creators can self-select.
- **Add `BrandProfile.slug`** (§2.13) and build the public brand page properly — it's SEO surface area you're leaving on the table, and it's what makes a brand's Kollabo profile something they'll link to.
- **Make `seed-contracts.js` idempotent** so it can be a CI fixture rather than a demo-only script (§28).
- **Finish the repo rename** (`@anjuman/web`, `creators-circle`). It's cosmetic, but every day it stays, more references accrue and the eventual rename gets bigger. The tokens are also still named `anjuman-*` (§4 of the reference) — rename those in the same pass.

---

## 6. New features — detailed specifications

Ordered by value. Each has the problem it solves, the mechanism, schema, API surface, and acceptance criteria.

---

### 6.1 Escrow and payouts — the one that unlocks everything

**Problem.** Brands don't want to pay a stranger up front. Creators don't want to work for a stranger without knowing the money exists. Today, both risks are resolved off-platform, which means Kollabo captures no revenue and has no leverage in disputes. Every metric that matters — GMV, take rate, repeat rate, retention — is currently zero by construction.

#### The regulatory constraint you need to design around

This is the part that changes the architecture, so it's worth being precise. Under SBP's licensing framework, the categories differ in exactly the way that matters here: PSPs are for non-bank entities that process, route, and settle electronic transactions; unlike EMIs, they do not hold customer funds or issue stored value, cannot hold customer balances, and must maintain strict segregation of settlement accounts. EMIs are the licensed category for holding funds — an EMI maintains a Trust Account with a licensed bank in Pakistan, in which it must place all funds collected from customers against issuance of e-money, segregated from the EMI's own funds. And critically, SBP's revised EMI regulations expanded the permitted services to include Escrow Services for domestic e-commerce transactions, alongside payments aggregation and payment initiation.

The capital bar for becoming one yourself is real: an EMI license requires PKR 200 million in minimum paid-up capital — actually paid up, not proposed, through a three-stage approval process.

**The implication for Kollabo: do not build your own escrow, and do not hold funds in a Kollabo-owned bank account with a `Transaction` table as the ledger of record.** That is deposit-taking without a licence. Partner with a licensed EMI that offers escrow for domestic e-commerce, or structure a trust/escrow arrangement with a commercial bank. Kollabo's `Transaction` ledger becomes a *mirror* of the partner's positions for UX and reconciliation, never the authority. Get this reviewed by a Pakistani financial services lawyer before you write the integration — the cost of that review is trivial next to the cost of unwinding it.

#### Rails to support

The infrastructure is mature enough that this is an integration problem, not an invention problem. Pakistan's stack now covers rails (Raast), wallets (JazzCash, easypaisa), gateways (PayFast, Safepay, PayPro, XPay) and EMIs (NayaPay, SadaPay). Notably for a marketplace doing many outbound payouts: SBP recently granted the first Raast Business API licences to five fintechs — 1LINK, Finja, NayaPay, SadaPay Business and PayFast — authorising them to embed Raast payment initiation and collection APIs into business banking products, which is the first formal opening of the national instant payment rail to private-sector B2B use.

Raast matters disproportionately for your economics, because a marketplace pays fees on **both** legs. On the collection side, wallet payments typically run 1.5–3%, cards 2.5–3.5%, while bank transfer and Raast are typically lowest — often under 1% or free. On a PKR 100,000 campaign, that's the difference between paying ~PKR 3,000 in fees and ~PKR 500.

**Recommended rail priority:**

| Leg | Primary | Secondary | Why |
|---|---|---|---|
| Brand funds escrow | Raast P2M / bank transfer | Card | Cheapest; brands are businesses with bank accounts and are less price-sensitive to a redirect than to a 3% fee |
| Creator payout | Raast to IBAN | JazzCash / easypaisa wallet | Instant, near-free; wallet fallback for creators who are unbanked |

Wallet payout matters more than it looks — a meaningful share of younger creators have a JazzCash or easypaisa wallet and no bank account. Note also that the revised EMI regulations increased monthly wallet limits and introduced new services, including specific accommodation for freelancer segments, which is directly relevant to creator payouts.

#### Money flow

```
1. Brand accepts application → Contract (pending_signature)
2. Creator signs → Contract (active), escrow_required
3. Brand funds escrow → Transaction(escrow_fund, pending)
   └─ partner webhook confirms → Transaction(completed), escrowState=funded
                                      Creator notified: "Funds secured, start work"
4. Creator submits milestone → ContentSubmission
5. Brand approves milestone → Transaction(escrow_release, pending)
                                      Transaction(commission, pending) ← platform fee
   └─ partner payout webhook → both completed, milestone paid
6. All milestones released → Contract completed
```

Two safeguards that matter:

- **Auto-release timer.** If a brand doesn't review a submission within N days (7 is a reasonable default), it auto-approves and releases. Without this, brands sit on approvals and creators lose faith in escrow entirely — this is the single most common failure mode of marketplace escrow. Warn at day 5, release at day 7, and make the timer visible to both sides from the moment work is submitted.
- **Partial release.** Milestone-level release is already implied by the schema. Make sure the fee is taken proportionally per release, not all at the end, or refunds get messy.

#### Schema additions

```prisma
model PayoutMethod {
  id String @id @default(cuid())
  userId String
  kind String // "raast_iban" | "bank_account" | "jazzcash" | "easypaisa"
  accountName String
  // store tokenised references from the partner, never raw account numbers
  providerToken String
  last4 String
  isDefault Boolean @default(false)
  verifiedAt DateTime?
  createdAt DateTime @default(now())

  @@index([userId, isDefault])
}

model EscrowIntent {
  id String @id @default(cuid())
  contractId String
  milestoneId String?
  amount Int // integer PKR
  platformFee Int
  withholdingTax Int @default(0)
  netToCreator Int
  state String // "requires_funding" | "funded" | "releasing" | "released" | "refunded" | "failed"
  provider String
  providerRef String?
  idempotencyKey String @unique
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([contractId, state])
}

model WebhookEvent {
  id String @id @default(cuid())
  provider String
  providerEventId String
  signature String
  rawBody String
  processedAt DateTime?
  error String?
  receivedAt DateTime @default(now())

  @@unique([provider, providerEventId]) // replay protection
  @@index([processedAt])
}
```

`Transaction` stays as the mirror ledger, unchanged in shape.

#### API surface

| Endpoint | Auth | Behaviour |
|---|---|---|
| `POST /api/contracts/[id]/escrow/fund` | brand (finance role) | Creates `EscrowIntent`, returns provider checkout URL/params |
| `POST /api/webhooks/payments/[provider]` | HMAC signature | Idempotent via `WebhookEvent` unique constraint; verify signature on **raw body before parsing** |
| `POST /api/milestones/[id]/release` | brand or system (auto-release job) | Creates release + commission intents |
| `POST /api/payout-methods` | any | Tokenises via partner; never touches raw account numbers |
| `GET /api/wallet` | any | Balance, pending, released, upcoming payouts |
| `POST /api/contracts/[id]/refund` | admin only | Dispute resolution path |

#### Acceptance criteria

- A duplicate webhook delivery produces exactly one ledger effect (test by replaying the same payload 10× concurrently).
- A funded contract shows `escrowState='funded'` derived from ledger state, and a reconciliation job comparing partner balances to ledger sums reports zero drift daily.
- A failed payout leaves the milestone approved and the escrow held, and surfaces a retry to the user — it never silently strands money.
- Auto-release fires at exactly 7 days and writes an `AuditEvent` with `actorType='system'`.
- Contract cannot reach `completed` with any `EscrowIntent` not in a terminal state (§2.4).

**Effort:** 8–12 weeks including partner selection, contracting, and integration. Partner onboarding and legal review are the long poles, not the code. **Start the partner conversations now, in parallel with everything else.**

---

### 6.2 Instant Book — fixed-price packages

**Problem.** The current flow is: brand posts campaign → waits → creators apply → brand shortlists → negotiates → accepts → contract. That's days of latency and a lot of brand-side work for a PKR 30,000 reel. Small brands — the bulk of the Pakistani market — will not run that process. This is the biggest liquidity constraint in the product and it's a flow problem, not a supply problem.

**Mechanism.** Let creators publish fixed-price, fixed-scope packages that a brand can buy directly, Fiverr-style, without a campaign existing.

```prisma
model CreatorPackage {
  id String @id @default(cuid())
  creatorId String
  title String // "1 Instagram Reel + 3 Stories"
  description String
  platform String
  deliverables Json // [{type, qty}]
  price Int // integer PKR
  turnaroundDays Int
  revisionsIncluded Int @default(1)
  usageRightsDays Int @default(30)
  active Boolean @default(true)
  ordersCount Int @default(0)

  @@index([creatorId, active])
  @@index([platform, price])
}
```

**Flow:** Brand clicks Book → confirms scope and date → funds escrow immediately → `Contract` is created already `active` with both signatures implied by the transaction, and a single milestone. No application, no negotiation, no waiting. The creator gets a 24-hour window to accept or decline (auto-refund on decline or timeout).

**Why it matters:** it converts browsing intent into GMV in one session. It gives you real, observed price data to power the rate-card guidance in §5.4. And it gives new creators a path to their first completed contract without competing in a campaign applicant pool, which directly addresses the cold-start problem in §5.5.

**Acceptance criteria:** a brand can go from `/discover` to a funded, active contract in under 3 minutes with no messages exchanged; declined bookings refund automatically within one business day.

**Effort:** 3–4 weeks after escrow exists.

---

### 6.3 Auto-generated media kit

**Problem.** Every creator maintains a media kit — usually a Canva PDF that goes stale in a month. It's the single most-requested creator tool and the most common reason a creator leaves a platform to close a deal elsewhere.

**Mechanism.** Generate one automatically from data Kollabo already holds: profile, connected-account metrics, `CreatorMetricSnapshot` trend charts, audience splits, rate card, portfolio, past `BrandCollab` records, and reviews. Two outputs from one renderer: a shareable public link (`kollabo.pk/kit/<slug>`, OG-tagged for WhatsApp preview) and a downloadable PDF.

**Why this is strategically valuable rather than just nice:** every creator who shares their kit link is distributing Kollabo to brands who aren't on the platform. The kit is a growth loop disguised as a creator tool. Put a soft "Hire on Kollabo" CTA on it and instrument the conversion.

**Details worth getting right:**
- Verified metrics get a badge; self-reported ones are visibly distinct. This makes connecting accounts feel valuable rather than invasive.
- Creator controls what's shown (some won't want rates public) via toggles.
- Regenerate on data change; cache the PDF in R2 with the profile's `updatedAt` as the cache key.
- Render with `@react-pdf/renderer` or headless Chromium in a worker — not in the request path.

**Effort:** 2–3 weeks. High creator-perceived value per unit of effort — probably the best ratio on this entire list.

---

### 6.4 Content usage rights and paid amplification

**Problem.** This is where creator marketing budget has actually moved. Brands increasingly want to run creator content as paid ads (Meta Partnership Ads, TikTok Spark Ads) rather than just relying on organic reach. Doing that requires an explicit usage-rights grant and, for paid amplification, an authorisation code from the creator. Today Kollabo has no concept of usage rights at all, which means every deal that involves them happens off-platform — and those are the larger deals.

**Mechanism.**

```prisma
model UsageRights {
  id String @id @default(cuid())
  contractId String
  scope String // "organic_only" | "paid_social" | "full_commercial"
  channels Json // ["meta_ads", "tiktok_ads", "website", "ooh"]
  territory String @default("PK")
  durationDays Int
  startsAt DateTime?
  exclusivity Boolean @default(false)
  exclusivityCategory String? // "no competing fashion brands"
  additionalFee Int @default(0)
  whitelistCode String? // Spark Ads / Partnership Ad code
  createdAt DateTime @default(now())

  @@index([contractId])
}
```

**UX:** usage rights become a priced line item in the campaign brief and the application, not an afterthought. "Organic only" is free; "+90 days paid social" adds a creator-set percentage. A creator sets their multipliers once in their rate card and it applies everywhere.

**Expiry handling is the important part.** When rights lapse, notify the brand 14 days ahead with a one-click renewal that creates a new `Transaction`. This is high-margin recurring revenue on work that's already done, and brands genuinely want the reminder because running an ad on expired rights is a real legal exposure for them.

**Effort:** 3 weeks. Directly monetisable — it raises average contract value on exactly the deals you most want.

---

### 6.5 Campaign performance tracking and ROI reporting

**Problem.** `ContentSubmission.livePostUrl` is captured and then nothing happens to it. Brands have no idea what they got for their money, so they can't justify a second campaign. Repeat purchase is the entire economics of a marketplace, and right now nothing in the product supports it.

**Mechanism.** Once a `livePostUrl` is recorded, poll its metrics via the creator's connected account (which you have OAuth for, on a contract they consented to) on days 1, 3, 7, 14, and 30.

```prisma
model PostPerformance {
  id String @id @default(cuid())
  submissionId String
  observedAt DateTime
  impressions Int?
  reach Int?
  likes Int?
  comments Int?
  shares Int?
  saves Int?
  clicks Int?
  videoViews Int?

  @@unique([submissionId, observedAt])
}
```

**Brand-facing output — a campaign report showing:**
- Total reach and impressions across all creators, with cost-per-thousand actually achieved
- Per-creator performance ranked, so the brand knows who to rehire
- Engagement rate vs. the creator's own baseline (did this post outperform their normal?) — this is the metric brands find most persuasive and almost nobody provides it
- Estimated media value, clearly labelled as an estimate with the methodology stated
- Exportable as PDF for the brand's internal reporting

**Add UTM/link tracking** for brands running conversion campaigns: generate a `kollabo.pk/l/<code>` short link per creator per campaign, redirect with UTM parameters attached, and count clicks. For e-commerce brands this closes the loop from creator to sale and turns a soft "we got reach" into "we got 340 clicks at PKR 88 each."

**Effort:** 4–5 weeks. Dependent on live metric APIs (§5.3), so sequence it after Instagram is connected.

---

### 6.6 WhatsApp as the primary notification channel

**Problem.** Building an email notification system for the Pakistani market and expecting engagement is a mistake. Email open rates in this segment are poor. WhatsApp is where these users actually live, and it's where the deal will move if you don't put yourself there first.

**Mechanism.** WhatsApp Business Platform (Cloud API) as a first-class channel in the `NotificationDelivery` model from §3.6.

**Practical constraints to design around:**
- Business-initiated messages require pre-approved templates, submitted and reviewed per template. Budget lead time.
- Once a user replies, a 24-hour customer service window opens in which you can send freeform messages. This is the mechanic to exploit — a notification that invites a reply extends your window.
- Pricing is per-conversation by category (utility/marketing/authentication), so batch related notifications rather than firing one per event.
- Opt-in must be explicit and revocable. Capture it during onboarding with a clear value statement, not a pre-checked box.

**Templates worth building first:**

| Trigger | Recipient | Why it earns its cost |
|---|---|---|
| New application on your campaign | Brand | Brand response time is the marketplace's bottleneck |
| Shortlisted / invited | Creator | The highest-emotion moment in the funnel |
| Contract ready to sign | Creator | Direct GMV blocker |
| Escrow funded | Creator | The trust moment — "the money is really there" |
| Milestone due tomorrow | Creator | Prevents the late delivery that causes disputes |
| Work submitted for review | Brand | Starts the auto-release clock visibly |
| Payment released | Creator | The moment worth celebrating; drives word of mouth |
| New message (batched, max 1/hour) | Both | Pulls conversation back on-platform |

Also worth building: **OTP over WhatsApp** as the primary channel with SMS as fallback. It's cheaper than Twilio SMS in Pakistan, more reliable in delivery, and sidesteps the SMS pumping fraud exposure in §2.10 entirely.

**Effort:** 3 weeks including template approval lead time. Very high expected impact on activation and time-to-first-contract.

---

### 6.7 Barter and product seeding campaigns

**Problem.** A large share of Pakistani creator collaborations are barter — the brand sends product, the creator posts, no cash changes hands. Kollabo's model assumes cash (`agreedRate`, escrow, payout) and therefore excludes a whole category of real activity, including most of the entry-level deals that get a creator their first `BrandCollab` record.

**Mechanism.** A `Campaign.compensationType` of `cash | product | hybrid`, plus product logistics:

```prisma
model ProductSeeding {
  id String @id @default(cuid())
  contractId String
  productName String
  declaredValue Int // PKR — for the creator's tax records and your GMV proxy
  shippingAddressEncrypted String // encrypted at rest
  courier String? // "tcs" | "leopards" | "postex" | "trax"
  trackingNumber String?
  shippedAt DateTime?
  deliveredAt DateTime?
  status String // "pending_address" | "shipped" | "delivered" | "returned"
}
```

**Flow:** brand accepts → creator confirms and provides a shipping address (revealed only post-acceptance, encrypted, and auto-purged after delivery + 30 days) → brand ships and enters tracking → delivery confirmation starts the content clock.

**Why bother if there's no take rate?** Three reasons. It's the entry point for small brands who will later run cash campaigns. It's how new creators build the completed-collaboration count that drives ranking (§5.5). And a `hybrid` type — product plus a smaller cash fee — is genuinely common and does carry a take rate.

**Effort:** 3 weeks. Courier API integrations (TCS, Leopards, PostEx) can come later; manual tracking-number entry is fine for v1.

---

### 6.8 Smart matching and AI-assisted briefs

**Problem.** Brands write vague briefs ("need influencers for our new lawn collection") and then complain about irrelevant applicants. Creators apply to campaigns they'll never win. Both sides waste time, and matching quality is what a marketplace is actually selling.

**Two components:**

**(a) Guided brief builder.** Replace the free-text `brief` field with a structured flow: objective (awareness / launch / conversion / UGC) → audience → deliverables → budget → timeline → usage rights. Generate polished brief prose from the structured answers rather than asking for prose. Show a live "23 creators match this brief" counter as they fill it in, which does two useful things: it prevents impossible briefs (PKR 5,000 for a 500K-follower creator) at the point of creation, and it makes the supply visible, which is reassuring.

**(b) Match scoring.** For each open campaign, score every eligible creator on niche overlap, city, platform, format capability, rate-vs-budget fit, availability, past performance in similar campaigns, and audience overlap. Surface the top 20 to the brand as "Recommended for this campaign" with an Invite action (which uses the `invited` flow from §5.1), and surface high-scoring campaigns to creators in their dashboard.

**Where an LLM genuinely helps** — and where it doesn't. It's good for turning structured answers into readable brief prose, for extracting structure from a brief a brand pasted in from elsewhere, and for drafting a creator's application pitch from their profile and the brief. It should **not** be the matching function itself — a deterministic scoring function you can explain, tune, and debug beats an embedding-similarity black box for something a brand will ask you to justify. Use embeddings as one input feature, not as the whole model.

**Effort:** brief builder 2 weeks; match scoring 3 weeks; LLM assists 1–2 weeks each.

---

### 6.9 Tax, invoicing, and compliance suite

**Problem.** The compliance obligations in §4.4 arrive whether or not you build for them. But brands hiring creators have a real, unmet pain: they need documentation for their own filings, and creators are generally not set up to provide invoices. Making this painless is a genuine reason for a serious brand to use Kollabo over WhatsApp — possibly the most defensible non-payment reason on this list.

**Build:**
- **Automatic invoice generation** per contract, per milestone. Sequential numbering, brand and creator NTN where available, service description, and provincial sales tax breakdown by jurisdiction.
- **WHT calculation and deduction at source**, with filer/non-filer rates applied correctly. Deduct on release and issue the certificate the brand needs.
- **Creator tax summary** — an annual statement of gross earnings, WHT deducted, and net received, downloadable at year end. Creators genuinely cannot get this anywhere today.
- **Filer status capture** — ask for NTN during creator onboarding, explain plainly that filers get less deducted. This is a real financial incentive to complete a profile field, and it nudges creators toward tax registration, which is a defensible public good you can talk about.
- **Brand-side export**: all contracts, invoices, and WHT certificates for a date range, as a zip.

**Effort:** 4–6 weeks, and needs a Pakistani tax advisor's input on rates and provincial rules. Do not guess at this. Dependent on payments.

---

### 6.10 Dispute resolution centre

**Problem.** The `Dispute` model exists with no UI on either side (§19, §30). When the first real dispute happens — and with escrow it will happen in week one — the team will handle it over WhatsApp with no record and no consistency.

**Mechanism.** A structured flow, not a free-text field:

1. **Reason selection** from a fixed set: work not delivered / work doesn't match brief / creator unresponsive / brand unresponsive / brand won't approve without cause / payment issue / other.
2. **Evidence collection** — the system automatically attaches the contract terms snapshot, all submissions and reviews, the message thread, and the relevant `AuditEvent` records. The parties add anything else.
3. **Mandatory 48-hour direct resolution window** before it escalates to Kollabo. Most disputes are misunderstandings and resolve here. Do not skip this step — it will handle the majority of volume for free.
4. **Escalation** to an admin queue with SLA tracking.
5. **Structured resolution**: full release / partial release with a specified split / full refund / cancel with no payment. The chosen resolution executes the corresponding ledger operations automatically rather than requiring manual ledger surgery.

```prisma
model DisputeEvidence {
  id String @id @default(cuid())
  disputeId String
  submittedById String
  kind String // "message" | "file" | "submission_ref" | "statement"
  content String
  fileKey String?
  createdAt DateTime @default(now())
}

model DisputeResolution {
  id String @id @default(cuid())
  disputeId String @unique
  resolvedByAdminId String
  outcome String // "release_full" | "release_partial" | "refund_full" | "cancel"
  creatorAmount Int
  brandRefund Int
  reasoning String
  createdAt DateTime @default(now())
}
```

Freeze escrow on escalation (not on filing — see §2.3), publish the resolution policy publicly so both sides know the rules before they need them, and track dispute rate as a core health metric.

**Effort:** 3–4 weeks. Must ship in the same release as escrow, not after it.

---

### 6.11 Admin console

**Problem.** §30 lists KYC and dispute review as having no admin UI. `/admin/discovery` is the only admin surface that exists. Every operational task is currently a Prisma Studio session against production, which is both a security problem and an unscalable one.

**Build `/admin` properly:**

| Section | Contents |
|---|---|
| **Verification queue** | Pending KYC with side-by-side CNIC/selfie view, NADRA match result, approve/reject with reason, SLA timer, full audit trail |
| **Dispute queue** | Open disputes sorted by age, full evidence bundle, resolution actions that execute ledger operations |
| **Ledger and reconciliation** | Daily partner-balance vs. ledger-sum diff, failed payouts, stuck intents, manual retry |
| **User and org management** | Search, view, suspend (bumps `sessionVersion`), impersonate-with-audit for support |
| **Content moderation** | Reported profiles, portfolio items, messages |
| **Trust signals** | Creators flagged by the authenticity model, off-platform leakage attempts |
| **Feature flags** | Kill switches for payments, social sync, new features — you will want these |
| **Metrics** | The marketplace health dashboard from §7 |

Require 2FA for every admin account. Every action writes an `AuditEvent`. Impersonation must be visibly banner-flagged in the UI and time-limited.

**Effort:** 4–6 weeks for a solid v1, and it's easy to defer — right up until the day you can't. Build the verification and dispute queues first; the rest can follow.

---

### 6.12 Mobile app — creator-first

**Problem.** `apps/mobile` is a single screen. Creators are mobile-native and predominantly on mid-range Android. The web app being responsive is not the same as being present on the home screen with push notifications.

**Sequencing recommendation:** don't build a full RN app yet. Do this instead:

**Phase 1 (2 weeks): PWA.** Installable, offline shell, and — critically — **web push on Android**, which covers the large majority of your creator base. This gets you most of the notification value at a fraction of the cost. iOS web push works from a Home Screen install; coverage is narrower but iOS is a small share of this market.

**Phase 2 (6–8 weeks): React Native, creator-side only.** Expo SDK is already scaffolded. Scope: dashboard, opportunities, applications, contracts, submit work, messages, wallet, push. Deliberately exclude the creator onboarding wizard, all brand-side flows, and admin — brands work at a desk, creators work from a phone. Half the app, most of the value.

**Phase 3: brand-side mobile,** only if usage data justifies it. It likely won't for a while.

The reference is right that the web API is the API — keep it that way and treat the RN client as one more consumer.

---

### 6.13 Affiliate and performance-based deals

**Problem.** E-commerce brands increasingly want performance deals — creator earns a commission on sales driven — rather than flat fees. Kollabo's contract model only supports flat `agreedRate`. This is a growing share of the market and currently invisible to the platform.

**Mechanism.** Extend `Contract` with `compensationModel: fixed | commission | hybrid`. Issue a per-creator tracking link and discount code. Track conversions via the short-link redirect plus a lightweight brand-side pixel or a Shopify/WooCommerce app. Commission accrues in the ledger and pays out on a monthly cycle.

The honest difficulty here is attribution and trust: the brand reports the sales, and the creator has to believe them. Mitigate by requiring the brand to integrate the pixel or app (so Kollabo observes conversions directly rather than taking the brand's word), and by holding a rolling commission balance in escrow.

**Effort:** 6 weeks. Genuinely valuable but sequence it well after the core payment loop is proven — don't take on attribution disputes before you can handle ordinary ones.

---

### 6.14 Urdu and Roman Urdu

**Problem.** `User.lang` exists in the schema with no implementation. The current product is English-only, which caps the addressable creator base at English-comfortable urban creators — a real but limited slice. Creators in Faisalabad, Multan, Peshawar, Hyderabad, and the smaller cities are a large untapped supply pool, and they're cheaper for brands, which makes them commercially attractive on both sides.

**Scope, in priority order:**

1. **Roman Urdu first, not Urdu script.** This is the counterintuitive but correct call — Roman Urdu is how most Pakistanis actually type, it needs no RTL work, no font loading, and no layout changes. It's a strings-file exercise. Urdu script is a much larger project (RTL layout, Noto Nastaliq at real file sizes, mixed-direction text with English brand names embedded) and should follow only if demand justifies it.
2. **Search alias coverage.** `DiscoveryTaxon.aliases` is already a JSON array built for exactly this — the reference cites 'LHR' for 'Lahore'. Populate it with Roman Urdu and colloquial terms across every taxon: *kapray* for fashion, *khana* for food, *Lahore/Lahor*, and so on. This is cheap, immediate, and makes search work for people typing how they speak.
3. **Onboarding and notifications** in Roman Urdu.
4. **Bilingual profiles** — let a creator write their bio in either, and don't penalise non-English bios in the readiness score (check that `readiness` isn't implicitly doing this via length or language heuristics).

Use `next-intl` with the App Router. Persist the choice on `User.lang`, which is already there.

**Effort:** 3 weeks for Roman Urdu across the core flows. Meaningful TAM expansion for modest effort.

---

## 7. Measurement — you can't improve what you don't instrument

The reference mentions no analytics tooling at all. Before optimising anything, instrument these. PostHog is the pragmatic choice (product analytics, session replay, feature flags, and self-hostable if data residency becomes a requirement per §4.1).

**Core marketplace health metrics:**

| Metric | Definition | Why it's the one that matters |
|---|---|---|
| **Time to first contract** | Signup → first signed contract, by side | The single best predictor of retention on both sides |
| **Liquidity** | % of campaigns receiving ≥3 qualified applications within 72h | If this drops below ~60%, brands churn and no feature fixes it |
| **Fill rate** | % of campaigns that result in a signed contract | Measures matching quality, not just volume |
| **Creator activation** | % of signups who complete profile + connect ≥1 social | The gate to everything downstream |
| **Brand activation** | % of signups who post a campaign or book a package | Same, brand side |
| **Repeat rate** | % of brands with ≥2 contracts in 90 days | The whole business. If this is low, you have a lead-gen tool, not a marketplace |
| **Take rate realised** | Commission collected ÷ GMV | Reveals leakage — if realised is below nominal, deals are completing off-platform |
| **Dispute rate** | Disputes ÷ completed contracts | Trust health; watch it hard in the first 90 days of escrow |
| **Search → profile → contact funnel** | Conversion at each step | Where Discover is actually failing |
| **Off-platform leakage signals** | Contact-share attempts on unfunded threads | Sizes the disintermediation problem you're currently blind to |

**Funnel events to fire from day one:** `signup_started`, `role_selected`, `onboarding_step_completed{step}`, `social_connected{platform}`, `profile_published`, `search_performed{filters}`, `creator_profile_viewed`, `invite_sent`, `application_submitted`, `application_status_changed`, `contract_created`, `contract_signed`, `escrow_funded`, `work_submitted`, `milestone_approved`, `payment_released`, `review_left`, `dispute_opened`.

**Log search impressions.** You need them for the impression-starved ranking boost (§5.5), for measuring exploration, and for showing creators a "your profile appeared in 47 searches this week" stat — which is a genuinely effective retention hook for the creator side, because it makes an otherwise invisible platform feel like it's working for them.

Add **Sentry** (the `NEXT_PUBLIC_SENTRY_DSN` slot already exists per §5 of the reference — just wire it) and structured request logging with a correlation ID threaded through to the payment partner calls.

---

## 8. Monetisation

The reference documents a `commission` transaction type but no rate, and no pricing model anywhere. Worth deciding explicitly, because it shapes the product.

**Recommended structure:**

| Stream | Model | Notes |
|---|---|---|
| **Take rate** | 10% from the creator, 5% service fee from the brand | Splitting the fee across both sides is easier to swallow than 15% on either. Show the creator their net clearly at every step — nothing erodes trust like a surprise deduction |
| **Verified badge** | Free once NADRA verification is live | Do **not** charge for trust. Charging for verification makes verification meaningless and it's the wrong incentive |
| **Brand subscription** | PKR 15–25K/month for teams: unlimited invites, verified-metrics filtering, campaign reports, team seats, priority support | Agencies will pay for this. Individual small brands won't and shouldn't have to |
| **Featured placement** | Paid slots in Discover, clearly labelled as promoted | Only once organic ranking is trusted. Do this too early and you poison the well |
| **Usage rights renewals** | Percentage of the renewal fee | High margin, recurring, on work already delivered (§6.4) |
| **Instant payout** | Small fee to release funds before the auto-release window | Optional, opt-in, genuinely valuable to creators with cash-flow pressure |

**Launch pricing note:** run 0% take rate for the first 3–6 months, publicly and with a stated end date. You need GMV volume and trust more than you need early revenue, and "free while we prove it works" is an honest, effective launch position. Set the end date, communicate it early, and honour it — the credibility of that first promise sets the tone for everything after.

**On disintermediation and fees:** a 15% total take rate only survives if on-platform completion is clearly better. That means escrow (§6.1), verified metrics (§5.2), dispute protection (§6.10), and tax documentation (§6.9) all doing real work. Fee level and product value are the same decision.

---

## 9. Suggested sequencing

### Now — next 8–12 weeks

**Non-negotiable, in parallel:**

1. **Open payment partner conversations today.** Contracting and compliance review are the longest lead time in the entire plan and nothing about them is engineering work. Start now (§6.1).
2. **Start Meta App Review** for Instagram insights (§5.3). Also weeks of lead time, also not engineering-blocked.
3. Switch off `prisma db push` to versioned migrations, before any real data exists (§2.11).
4. Fix the ranking dead term and the `available` decay (§2.1).
5. Resolve the dispute-status contradiction (§2.3) and gate contract completion (§2.4).
6. `sessionVersion` for session revocation (§2.7).
7. Rate limiting across all mutating routes; SMS pumping protections (§2.10).
8. Instrument analytics and Sentry (§7) — do this first, so you can measure the effect of everything after.
9. Storage layer with presigned uploads; move KYC images to a private encrypted bucket (§3.5, §4.1).
10. Postgres migration with native arrays, enums, GIN and composite indexes (§3.4).

**Highest-value features in this window:**
- `Thread` model + unread counts + notification system (§3.1, §3.6)
- Brand-initiated invites and shortlists (§5.1)
- WhatsApp notifications (§6.6)
- Auto-generated media kit (§6.3) — best effort-to-value ratio available
- Onboarding improvements (§5.4)

### Next — months 3–6

- **Escrow and payouts** (§6.1) — everything else is scaffolding until this lands
- **Dispute resolution centre** (§6.10) — ships with escrow, not after
- **Admin console**: verification and dispute queues first (§6.11)
- Instagram live metrics + authenticity scoring (§5.3, §5.2)
- Instant Book packages (§6.2)
- Organizations and team seats (§3.2)
- PWA with push (§6.12 phase 1)
- Roman Urdu (§6.14)

### Later — months 6–12

- Usage rights and paid amplification (§6.4)
- Performance tracking and ROI reports (§6.5)
- Tax and invoicing suite (§6.9)
- Smart matching and AI brief builder (§6.8)
- Barter and product seeding (§6.7)
- React Native creator app (§6.12 phase 2)
- Affiliate and performance deals (§6.13)

---

## 10. If you only do three things

1. **Ship escrow.** Nothing else on this list produces revenue, retention, or defensibility without it, and the partner and legal lead times mean the clock starts the day you make the first call. Not the code — the call.

2. **Make verified metrics the reason to be here.** You already collect `CreatorMetricSnapshot` time series and you already have an unused `authenticityScore` field. Turning that into a trust signal brands can filter on is the thing a WhatsApp group can never replicate, and it's most of the way built.

3. **Close the disintermediation hole.** Contact masking on unfunded threads, structured offers in-thread, escrow, and reviews. Right now there is no reason for a brand and creator to finish a deal on Kollabo, and no way for you to even see how often they don't.

The engineering foundation here is better than the feature gaps make it look. The contract framework, ledger design, and discovery layer are all things teams usually get wrong and rebuild. What's missing is mostly the commercial layer on top — and the sequencing constraint is that the two things with the longest lead times (payment partner, Meta App Review) are both things you can start this week without writing a line of code.

---

## Sources for the regulatory and payments claims

The Pakistan-specific claims in §4.1 and §6.1 were verified against current sources rather than written from memory, since both areas have moved recently. Verify anything you're about to build on with counsel before committing.

**Data protection (§4.1)**
- DLA Piper, *Data Protection Laws of the World — Pakistan* (last modified 17 March 2026) — https://www.dlapiperdataprotection.com/guide.pdf?c=PK
- Chambers, *Data Protection & Privacy 2026 — Pakistan* — https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/pakistan

**Payments licensing and rails (§6.1)**
- SBP, *Regulations for Electronic Money Institutions* — https://www.sbp.org.pk/psd/2023/C3-Enclosure-Regulations-EMIs.pdf
- SBP press release, revised EMI regulations (21 June 2023), which added escrow services for domestic e-commerce to the permitted EMI activity list — https://www.sbp.org.pk/press/2023/Pr-21-Jun-2023-1.pdf
- Distinction between PSP/PSO and EMI, and the PKR 200m capital requirement — https://legasset.com/ready-made-psp-licenses-in-pakistan/ and https://digitalpakistan.pk/emi-license-pakistan-in-2026/
- Raast Business API licences to 1LINK, Finja, NayaPay, SadaPay Business and PayFast (August 2026) — https://nextgen.pk/news/sbp-raast-business-api-license-b2b-payments-pakistan
- Gateway fee comparison and Raast pricing — https://rapidgateway.pk/resources/payfast-pakistan-review and https://blog.clicks.com.pk/top-10-payment-gateways-pakistan/

**Tax (§4.4, §6.9)** — no source is cited because rates and provincial rules change annually and vary by jurisdiction. This section needs a Pakistani tax advisor, not a web search.
