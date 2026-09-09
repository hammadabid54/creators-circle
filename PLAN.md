# Creators Pakistan — Product Plan

_Last updated: 2026-09-09 (v2 — pivoted to influencer marketing platform)_

> **v2 pivot (2026-09-09, 01:10):** Original concept was a **freelance services marketplace** (Upwork/Fiverr model — graphic designers, video editors, writers, etc.). User clarified the goal: **an influencer marketing platform** (Aspire/Grin/Modash model) for **Instagram + YouTube creators** in Pakistan, listed by **followers + engagement** (not skills/services). Categories are **niches** (Lifestyle, Fashion, Health, etc.), not services. Plan rewritten below. Mockup at `branding/homepage-v2.html`.

## 1. One-liner

A discovery + collaboration platform where Pakistani Instagram and YouTube creators and brands find each other — searched by niche, followers, and engagement, paid in PKR through local rails, with escrow on every deal.

## 2. Positioning

- **For brands**: Discover vetted Pakistani Instagram and YouTube creators by niche, follower count, engagement, and city. Negotiate and pay in PKR with escrow protection. No more cold DMs or agency middlemen.
- **For creators**: Get discovered by Pakistan's best brands. Showcase your Instagram and YouTube stats, set your rate card, get paid in PKR within 48 hours via JazzCash / EasyPaisa / bank.
- **Headline pitch**: _"Discover Pakistan's top Instagram and YouTube creators — search by niche, followers, and engagement."_
- **Tagline (homepage hero)**: "Where Pakistani creators and brands meet."
- **What we are NOT**: a freelance services marketplace (no graphic designers, video editors, writers, voiceover artists), a TikTok-only platform, a global Aspire/Grin clone.

## 3. Honest concern with current scope

Your scoping answers stack two risk factors:

1. **"All niches" + "all 4 moats" = slower cold start.** A broad vertical with four differentiators makes marketing fuzzy.
2. **"All moats" is not a wedge.** A great product makes one thing the headline and uses the others as supporting proof.

**Recommended compromise** (you decide):
- Build with all 12 niches in the product from day 1.
- Seed marketing + supply around 3 niches: **Lifestyle, Fashion, Beauty**. These are the highest-velocity influencer categories in PK right now and have the most brand spend.
- Stack all 4 moats in the product, but lead marketing with **"audience-authenticity-checked creators + 48h local payouts"** because it's measurable and concrete.

## 4. Personas

### Creator
- Age 22-35, based in Karachi / Lahore / Islamabad / Faisalabad
- 10K-500K followers on Instagram and/or YouTube
- Niche: lifestyle, fashion, beauty, fitness, food, travel, tech, parenting, education, finance, comedy
- Languages: Urdu + English (+ optional Punjabi, Sindhi, Pashto)
- Currently uses Instagram DMs + cold emails + word-of-mouth to find brand deals
- **Pain**: chasing brands, slow payment, no portfolio trust signal, Fiverr takes 20% on services but no platform exists for IG/YT sponsorships in PK

### Brand
- Marketing manager at a Pakistani SMB, OR founder of a D2C brand, OR agency account manager
- Spends PKR 50K-500K/month on influencer content
- **Pain**: hard to find reliable creators, audience authenticity is opaque (fake followers), no contract enforcement, payment friction, agencies take 30-40%

## 5. Differentiator stack (ranked for execution)

| Rank | Moat | Role | MVP? |
|------|------|------|------|
| 1 | Local payments + 10% commission | **Headline pitch** | Yes — JazzCash + EasyPaisa integration |
| 2 | Verified creators | Trust layer | Yes — CNIC + portfolio audit + identity check |
| 3 | Escrow on every deal | Trust layer | Yes — custom ledger, mock gateway for MVP |
| 4 | Urdu/English bilingual UI | Table stakes | Yes — make it excellent, not a feature |

## 6. MVP scope (10-12 week build)

### Phase 1 — Foundation (Weeks 1-2)
- Repo setup: monorepo (web + mobile + shared packages)
- Brand identity: name, logo, color, typography
- Database schema (Prisma + PostgreSQL)
- Auth: phone OTP (primary) + email magic link
- User types: Creator, Brand, Admin
- Basic profile creation

### Phase 2 — Core marketplace (Weeks 3-5)
- Creator: create/edit gigs (title, price, description, samples, category, packages)
- Brand: post project (title, brief, budget range, deadline, category)
- Browse + search + filters
- Project feed for creators
- Gig feed for brands
- Save/favorite

### Phase 3 — Communication + transactions (Weeks 6-7)
- In-app messaging (real-time, Supabase Realtime)
- Proposals: creators bid on projects
- Contracts: from gig purchase OR project acceptance
- Mock payment flow (escrow ledger, no real gateway)
- Withdrawal request flow (creator side)

### Phase 4 — Mobile + real payments (Weeks 8-9)
- React Native app (Expo SDK 52), iOS + Android
- Core flows: browse, message, contracts, profile
- Real payment integration: JazzCash + EasyPaisa merchant APIs
- Bank transfer (manual reconciliation for v1)
- Push notifications (Expo)

### Phase 5 — Trust + polish (Weeks 10-12)
- CNIC verification (NADRA integration, manual fallback for MVP)
- Reviews + ratings
- Disputes flow
- Admin dashboard
- Analytics
- **National beta launch** with 50-100 seeded creators across KHI / LHE / ISB and 5-10 brand partners

## 7. Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Web | Next.js 15 (App Router), TypeScript, Tailwind v4, shadcn/ui, Framer Motion | Matches your Omni Path stack, fastest iteration |
| Mobile | React Native (Expo SDK 52), TypeScript, React Navigation | One codebase for iOS + Android, fast OTA updates |
| Backend | Node.js (Fastify) on Railway | OR Next.js API routes — decide in Phase 1 |
| Database | PostgreSQL (Supabase or Neon) | Reliable, supports full-text search + faceted search (follower count, engagement) |
| ORM | Prisma | Type-safe, good migrations |
| Auth | Supabase Auth (phone OTP via Twilio) + email magic link | Phone OTP is the norm in PK |
| Realtime chat | Supabase Realtime | Built-in, no extra infra |
| Storage | Cloudflare R2 | Cheap egress for portfolio videos and content samples |
| Search | Meilisearch (self-hosted) with faceted search (niche, follower count range, engagement, city) | Cheaper than Algolia, fast enough, supports the multi-filter discovery UX |
| Social APIs | Instagram Graph API, YouTube Data API v3 | Pull follower counts, engagement rate, audience demographics, video stats |
| Payments | JazzCash API, EasyPaisa API, Stripe Connect (optional) | Local-first, Stripe as fallback |
| Email | Resend | Same as Omni Path |
| Push | Expo Push Notifications | One config for iOS + Android |
| Analytics | PostHog (self-host option) | Privacy-friendly, product analytics |
| Hosting | Vercel (web) + Expo EAS (mobile) + Supabase + Railway (worker) | Proven combo |
| CI/CD | GitHub Actions | Standard |
| QA | Puppeteer + Lighthouse | Same as Omni Path |

## 8. Data model (high level)

### Core entities

- `User` — id, phone, email, type (creator/brand/admin), name, avatar, lang, created_at
- `CreatorProfile` — user_id, bio, niches[], languages[], city, verified_overall, cnic_verified, response_rate, avg_brand_rating
- `SocialAccount` — creator_id, platform (instagram/youtube), handle, external_id, followers, engagement_rate, avg_views, last_synced_at
- `Audience` — creator_id, platform, top_cities[], age_split, gender_split, authenticity_score, last_synced_at
- `RateCard` — creator_id, post_rate, story_rate, reel_rate, youtube_long_rate, youtube_short_rate, currency (PKR)
- `PortfolioItem` — creator_id, type (image/video), url, caption, created_at
- `BrandCollab` — creator_id, brand_name, brand_logo, campaign_type, year, results_summary, brand_verified
- `BrandProfile` — user_id, company, industry, ntn, website, logo, typical_budget
- `Campaign` — brand_id, title, brief, budget_min, budget_max, target_niches[], target_platforms[], target_cities[], target_age[], deliverables (count of posts/stories/reels/videos), timeline, status
- `Application` — campaign_id, creator_id, proposed_rate, pitch, portfolio_links, status (pending/shortlisted/accepted/rejected)
- `Contract` — campaign_id, creator_id, brand_id, agreed_rate, deliverables[], status, escrow_state
- `Milestone` — contract_id, title (e.g., "3 Reels"), amount, status (pending/submitted/approved/disputed)
- `ContentSubmission` — contract_id, milestone_id, file_urls, caption, submitted_at, status
- `Message` — thread_id, sender_id, body, media, created_at
- `Review` — contract_id, reviewer_id, rating (1-5), body, response_rate_score, content_quality_score
- `Transaction` — contract_id, type, amount, gateway, status, gateway_ref
- `Dispute` — contract_id, opened_by, reason, status, resolution
- `Verification` — user_id, cnic_front, cnic_back, selfie, status, reviewed_by

### Niches (12 primary, 6 extended)

| Primary (homepage grid) | Extended (filter only) |
|------------------------|------------------------|
| Lifestyle | Motivation |
| Fashion | Photography |
| Health & Wellness | Gaming |
| Fitness | Sports |
| Food & Cooking | Home & Decor |
| Travel | Auto & Vehicles |
| Beauty & Makeup | |
| Tech & Gadgets | |
| Parenting | |
| Education | |
| Personal Finance | |
| Comedy & Entertainment | |

### Creator metrics (what we display)

**On the search card:**
- Instagram + YouTube follower count (combined reach)
- Engagement rate (avg %)
- Number of past brand collabs
- Languages (Urdu, English, Punjabi, Sindhi, Pashto)
- Top niche tags
- City
- Starting rate (per post / per reel / per video)
- Verified badge

**On the full profile page:**
- All of the above, plus:
- Audience demographics (top cities, age, gender split)
- Audience authenticity score (bot detection)
- Posting frequency
- Average views (YouTube)
- Portfolio of content samples
- Past brand collaborations (logos + results)
- Response rate, completion rate
- Brand reviews/ratings
- Full rate card (post / story / reel / YT long / YT short)
- Languages
- Available for campaigns (yes/now/next month)

## 9. Payment flow

1. **Brand funds contract** → JazzCash / EasyPaisa / bank transfer → platform escrow ledger
2. **Creator submits content** for a milestone → brand reviews
3. **Brand approves** → funds released to creator's pending balance (minus 10% commission)
4. **Creator withdraws** → JazzCash / EasyPaisa / bank → arrives in 24-48h
5. **Disputes** freeze the escrow until admin resolves
6. **All transactions** logged for FBR reporting

## 10. Information architecture

- `/` Home (role-aware)
- `/creators` Browse creators (filters: niche, followers, engagement, platform, city, language, rate)
- `/creators/[handle]` Public creator profile
- `/campaigns` Browse open campaigns (for creators)
- `/campaigns/new` Post a campaign
- `/campaigns/[id]` Campaign detail + applications
- `/messages` Inbox
- `/dashboard` Role-aware dashboard
- `/dashboard/contracts` Active contracts
- `/dashboard/earnings` Creator earnings + withdrawals
- `/dashboard/campaigns` Brand campaign list
- `/profile/[handle]` Public profile (creator or brand)
- `/settings` Settings (including social account linking)
- `/onboarding` Multi-step creator/brand onboarding
- `/admin` Admin panel

## 11. Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Instagram Graph API requires Business/Creator account + Meta app review | High | Use official Meta APIs, apply for `instagram_basic` and `instagram_manage_insights` permissions, support account-linking via OAuth |
| YouTube Data API v3 has strict daily quota (10K units/day) | Medium | Cache stats aggressively, only re-sync active creators, allow manual refresh on demand |
| Audience authenticity detection requires third-party (HypeAuditor, Modash API) | High | Use manual review + heuristics for MVP; integrate Modash or HypeAuditor API in v2 |
| JazzCash/EasyPaisa merchant APIs require business registration, slow onboarding | High | Use a payment aggregator (Safepay, Finja) as middleware; fall back to Stripe Connect sandbox for early testing |
| NADRA CNIC verification is bureaucratic | Medium | Manual review for MVP, automate later; offer "unverified" tier with limited features |
| Two-sided cold start (chicken-and-egg) | High | Seed 50-100 creators across KHI / LHE / ISB before public launch; partner with 5-10 brands willing to pilot |
| Mobile share: most PK users on low-end Android, 3G | Medium | App must be light (<30MB), fast on 3G, offline-tolerant |
| Regulation: FBR/PSEB rules for marketplaces, data localization | Medium | Register as a marketplace, comply with data localization (PK-hosted DB) |
| Competition: Branded.pk (defunct), local agencies | High | Lead with audience-authenticity check + 10% commission + escrow + Instagram-native UX |
| Escrow legally complex in PK | High | Phase 1: hold funds in platform business account with T&Cs as "agency relationship"; Phase 2: partner with a bank for proper escrow |

## 12. What's next (decisions I need)

1. **Name** — ✅ Locked: **Creators Circle**
2. **Brand identity direction** — ✅ Locked: D (youthful gradient, Instagram-native)
3. **Launch scope** — ✅ Locked: national, not city-specific
4. **Product type** — ✅ Locked: influencer marketing platform (IG + YT creators)
5. **Niches** — ✅ Locked: 12 primary (Lifestyle, Fashion, Health & Wellness, Fitness, Food, Travel, Beauty, Tech, Parenting, Education, Finance, Comedy) + 6 extended
6. **Tagline** — ✅ Locked: "Where Pakistani creators and brands meet."
7. **Hero headline** — "Find the right Pakistani creators for your brand." (with sub: "Discover vetted Instagram and YouTube creators across every niche…")
8. **Mockup v2** — saved at `branding/homepage-v2.html`. Screenshots at `branding/homepage-v2-hero.jpeg` and `homepage-v2-fullpage.jpeg`
9. **Trademark check** — flag a follow-up to verify `Creators Circle` is available in PK trademark registry (IPO Pakistan) before locking logos and domain purchase
10. **Next screens to mockup** — creator profile, brand dashboard, campaign posting, sign-up flow

### Name — Creators Circle

**Creators Circle** — a community where Pakistani creators and brands discover each other, collaborate, and grow. The name emphasizes connection and shared opportunity.

**Tagline options** (pick one or your own):
- _"Where Pakistani creators and brands meet."_ (descriptive, clear)
- _"A circle of talent. A world of possibilities."_ (community-focused)
- _"Creators Circle — hire, create, get paid in PKR."_ (action-driven)
- _"Pakistan's creator marketplace."_ (plain, SEO-friendly)

### Brand direction (locked)

**D — Youthful gradient (Instagram-native).** Vibrant gradients (purple-pink-orange), energetic, designed for 22-30 creator demographic. We will mitigate the older-brand-buyer gap with a separate "brand dashboard" that uses the same gradient but in a more restrained palette.

### Brand identity system (locked)

**Creator-Pop (maximalist)** — full color, type, and logo spec:

| Token | Value | Use |
|-------|-------|-----|
| Gradient primary | `#FF006E → #8338EC → #00D9FF` (hot-pink → purple → cyan) | Logos, headlines, CTAs, category cards |
| Accent yellow | `#FFD60A` | Highlights, badges, trust marks |
| Background | `#FAFAFA` (off-white) | Page background |
| Text ink | `#0A0A0F` (charcoal) | Body text, primary buttons |
| Text soft | `#4A4A55` | Secondary text |
| Border | `#E5E5EA` | Card borders, dividers |
| Headline font | Space Grotesk 700 | H1, H2, H3, logo wordmark |
| Body font | Inter 400/500/600 | Body, buttons, nav |
| Wordmark | `CREATORS CIRCLE` all caps, gradient fill, letter-spacing 0.05em | Header, footer, favicon-derived |
| Mark | 8-pointed burst star, gradient fill, 24px standard / 64px hero | Header icon, social avatar, favicon |

### Tagline (locked)

**"Where Pakistani creators and brands meet."**

### Brand direction options

- **A — Bold local**: Pakistan-flag-inspired (deep green + gold), strong typography, confident
- **B — Modern neutral** (like Omni Path): Charcoal + lime, serif headlines, minimalist
- **C — Warm craft**: Terracotta + cream + ink, hand-feel, artisan
- **D — Youthful gradient**: Vibrant gradients (purple-pink-orange), Instagram-native, energetic

## 13. What we will NOT build in MVP (and why)

- Live streaming
- AI-generated content tools
- Course selling
- Subscription-only creators
- NFT / creator-token features
- Multi-language beyond Urdu + English
- International expansion (PK-only for v1)
- TikTok as a platform (Instagram + YouTube only for v1; add TikTok when APIs and demand justify)
- Brand-side campaign management tools beyond what's in §13 (e.g., multi-channel attribution, complex approval flows)
- Native iOS / Android via Swift / Kotlin (we ship React Native from one codebase)

These are all tempting feature-creep traps. Each one is a separate product if/when we add it.

---

## 14. Dual-portal architecture

Two distinct experiences after sign-in, sharing the public marketing site and infrastructure.

### Brand portal (`/brand/*`)

**Who uses it:** marketing managers, D2C brand founders, agency account managers. They have budget and want to find and pay creators.

**Layout:** Top nav (Dashboard, Discover, Campaigns, Contracts, Messages, Analytics, Billing, Settings) + left sidebar (collapsible). Desktop-first, dense business-tool feel. Brand color treatment: same Creator-Pop gradient but more restrained on chrome, since this is the "spend money" interface.

| Surface | Path | Purpose |
|---|---|---|
| Dashboard | `/brand/dashboard` | Active campaigns, contracts awaiting approval, total spend MTD/YTD, top creators by ROI |
| Discover | `/brand/creators` | Filter creators, save searches, shortlist, compare side-by-side |
| Campaigns | `/brand/campaigns` | List, create, manage, archive campaigns |
| Contracts | `/brand/contracts` | Active contracts, milestone tracker, content submissions awaiting review |
| Messages | `/brand/messages` | Inbox with creators |
| Analytics | `/brand/analytics` | Reach, engagement, ROI, audience insights, spend trends |
| Billing | `/brand/billing` | Wallet, add funds, transactions, invoices, tax docs |
| Settings | `/brand/settings` | Company info, NTN, team, notifications, payment methods |

### Creator portal (`/creator/*`)

**Who uses it:** Instagram + YouTube creators. They have an audience and want to get paid by brands.

**Layout:** Mobile-first, bottom nav (Dashboard, Discover, Contracts, Earnings, Profile, Analytics) — Instagram-style. Desktop gets a top nav. Full Creator-Pop gradient treatment — this is the "earn money" interface, so it should feel energetic.

| Surface | Path | Purpose |
|---|---|---|
| Dashboard | `/creator/dashboard` | Profile views, invitations, active contracts, pending earnings, available balance |
| Discover | `/creator/campaigns` | Browse open campaigns, recommended matches, brand directory |
| Applications | `/creator/applications` | Pending, active, rejected applications |
| Contracts | `/creator/contracts` | Active contracts, milestone tracker, content submissions |
| Messages | `/creator/messages` | Inbox with brands |
| Earnings | `/creator/earnings` | Wallet, withdraw, transactions, tax docs |
| Analytics | `/creator/analytics` | Profile views, search appearances, audience insights, earnings trends |
| Profile Editor | `/creator/profile` | Bio, niches, languages, rate card, portfolio, collabs, availability |
| Settings | `/creator/settings` | Account, CNIC verification, linked social accounts, notifications, payout methods |

### Public pages (shared)

- `/` — Marketing homepage (current mockup)
- `/creators` — Public creator browse
- `/creators/[handle]` — Public creator profile (the most-shared surface)
- `/campaigns` — Public open-campaign browse
- `/signin` / `/signup` — Auth, role picker

### Mobile (React Native)

**Recommended: single app, role-aware.** On sign-up, user picks role. UI routes to that role's portal. Settings has a "switch role" option for users with both (a creator who also works at a brand). This avoids two separate apps and ~30% more code, while keeping distinct UX per role.

**Alternative:** two separate apps (one for creators, one for brands) — cleaner brand separation, ~30% more code, two app store listings to manage.

### Routing implementation (Next.js)

Route groups with role enforcement at the layout level:

```
app/
├── (public)/
│   ├── page.tsx                    # Marketing homepage
│   ├── creators/page.tsx           # Public creator browse
│   ├── creators/[handle]/page.tsx  # Public creator profile
│   ├── campaigns/page.tsx          # Public campaign browse
│   ├── signin/page.tsx
│   └── signup/page.tsx
├── (brand)/
│   ├── layout.tsx                  # Brand nav, role check
│   ├── brand/dashboard/page.tsx
│   ├── brand/creators/page.tsx
│   └── ... (all /brand/* routes)
├── (creator)/
│   ├── layout.tsx                  # Creator nav, role check
│   ├── creator/dashboard/page.tsx
│   └── ... (all /creator/* routes)
├── (admin)/
│   ├── layout.tsx                  # Admin role check
│   └── admin/...
└── layout.tsx                       # Root, auth middleware
```

Middleware enforces role check — a brand user trying to hit `/creator/*` is redirected to `/brand/*`. Creator user trying to hit `/brand/*` is redirected to `/creator/*`.

---

## 15. Analytics system

### Brand analytics (`/brand/analytics`)

| Widget | Source | Purpose |
|---|---|---|
| Total spend (MTD, YTD) | Our DB | Headline metric |
| Active campaigns count | Our DB | Pipeline health |
| Total reach (sum across active contracts) | IG/YT API (cached) | Aggregate brand impact |
| Total engagement (likes, comments, shares, saves) | Our DB (logged per content submission) | Quality of impact |
| Cost per engagement (CPE) | Computed | Efficiency |
| Cost per thousand impressions (CPM) | Computed | Media efficiency |
| Top 5 creators by ROI | Our DB (requires brand to log conversions) | Decision support |
| Spend by niche (pie chart) | Our DB | Budget allocation |
| Spend by creator tier (nano / micro / mid / macro) | Our DB | Strategy insight |
| Audience geography (where your reach came from) | IG/YT API | Targeting insight |
| Top-performing content (which deliverables drove most engagement) | Our DB | Replicate what works |
| Campaign timeline (Gantt) | Our DB | Project management |
| Industry benchmarks (anonymized, opt-in) | Our DB | Context for own performance |
| Export to CSV / PDF | Our DB | Reporting |

### Creator analytics (`/creator/analytics`)

| Widget | Source | Purpose |
|---|---|---|
| Profile views (this week, this month, trend) | Our DB (PostHog events) | Visibility signal |
| Search appearances (how many searches matched you) | Our DB (PostHog) | Discoverability |
| Invitations from brands (count) | Our DB | Inbound interest |
| Conversion funnel: views → invitations → contracts | Our DB | Funnel health |
| Lifetime earnings | Our DB | Headline metric |
| Monthly earnings trend (line) | Our DB | Cash flow visibility |
| Top contracts (by earnings) | Our DB | Repeat business insight |
| Audience: top cities (map / list) | IG/YT API | Targeting match for brands |
| Audience: age + gender split | IG/YT API | Same |
| Engagement rate (own content, trend) | IG/YT API | Content quality signal |
| Follower growth (per platform) | IG/YT API | Growth signal |
| Response rate, completion rate | Our DB | Trust signal |
| Average brand rating (with reviews) | Our DB | Reputation |
| Best content (top 5 posts by engagement) | IG/YT API | Showcase for brands |
| Export to CSV | Our DB | Reporting |

### Admin analytics (`/admin/analytics`)

- GMV (weekly, monthly, trend, by niche, by city)
- Active creators, active brands (DAU, WAU, MAU)
- New signups (per week, per source)
- Activation rate (% who complete profile + link 1 social account)
- Time to first contract (creator and brand sides)
- Contracts per month
- Average contract size
- Dispute rate (% of contracts that go to dispute)
- Withdrawal success rate
- Top niches by GMV
- Cohort retention (signup month → still active N months later)
- Fraud signals (suspicious activity, multiple accounts, fake engagement)

### Tech

- **PostHog** for product analytics (page views, events, funnels, feature flags, session replay)
- **Custom dashboards** in our own app, reading from our PostgreSQL DB
- **Charting:** Recharts on web, Victory Native on mobile
- **IG/YT data** cached in our DB, refreshed daily for active creators, on-demand for inactive
- **Aggregations** computed in PostgreSQL with materialized views for performance (refresh hourly)

---

## 16. Payment system (end-to-end)

### Actors

- **Brand** — pays for content
- **Creator** — receives payment for content
- **Creators Circle (platform)** — holds escrow, takes 10% commission
- **Payment gateways** — JazzCash, EasyPaisa, bank transfer (and optionally Stripe for testing)
- **FBR (tax authority)** — for reporting

### Account model

**Wallet per user** (both brands and creators):

- `available_balance` — usable immediately (brands) or withdrawable (creators)
- `pending_balance` — funds in escrow, will become available when contract closes
- `lifetime_spend` (brands) / `lifetime_earnings` (creators) — historical totals

### Flow (happy path)

1. **Brand funds wallet** (optional, recommended for high-volume brands)
   - JazzCash / EasyPaisa / bank transfer → Creators Circle's escrow bank account
   - Wallet `available_balance` increases
   - Transaction logged with gateway reference
2. **Brand creates contract** (after agreeing with creator)
   - Defines deliverables + milestones (each with title + amount + due date)
   - Total = sum of milestones
   - Status: `pending_funding`
3. **Brand funds the contract**
   - Either from wallet OR direct payment (JazzCash / EasyPaisa / bank → escrow)
   - Funds move from brand's wallet to contract escrow account
   - Status: `funded` (escrow_state: `held`)
4. **Creator works on milestone**
   - Submits content: file uploads (image/video), caption, optional live-post link
   - Status: `submitted`
5. **Brand reviews**
   - **Approve** → 90% of milestone amount moves from escrow to creator's `available_balance` (10% commission retained by Creators Circle). Status: `approved`.
   - **Request changes** → back to creator. Status: `revision_requested`.
   - **Reject** → opens dispute. Status: `disputed`.
6. **Auto-approval** — if brand doesn't respond within **7 days**, milestone auto-approves (configurable).
7. **Creator withdraws** (anytime `available_balance > 0`)
   - Withdrawal methods: JazzCash, EasyPaisa, bank transfer
   - Minimum: PKR 1,000
   - Phone OTP confirmation
   - Processing: 24-48h
   - Withdrawal fee: PKR 50-100 (covers gateway costs, prevents micro-withdrawals)

### Edge cases

| Case | Handling |
|---|---|
| Creator doesn't submit milestone | Brand can cancel after 14 days → full refund from escrow |
| Brand doesn't approve | Auto-approve after 7 days |
| Content rejected by brand | Creator can resubmit (up to 3 times) or open dispute |
| Either party opens dispute | Escrow frozen, admin reviews evidence, resolves within 7 days |
| Brand cancels funded contract before creator starts | Full refund to brand's wallet |
| Brand cancels mid-contract | Pro-rata refund for unstarted milestones; in-progress milestones go to dispute |
| Creator's withdrawal fails | Funds return to `available_balance`, retry option |
| Creator changes payout method | 24h cooldown, then usable |
| Both parties unresponsive for 30 days | Admin reaches out; if no response, contract marked dormant |

### Commission structure

- **10% platform commission** on every completed milestone (deducted from creator's payout)
- **Withdrawal fee:** PKR 50-100 (covers gateway costs)
- **No monthly fees**, **no setup fees**, **no listing fees**
- **Free** to sign up, browse, post campaigns, apply

**Who pays the commission?** **Recommended: deducted from creator's payout** (creator gets 90% of agreed amount). This is the standard marketplace model (Upwork, Fiverr, Aspire, Grin all work this way). Simpler billing for brands, no surprise fees, creators factor it into their rate.

### Compliance (FBR + tax)

- **WHT (Withholding Tax):** Pakistan requires WHT on certain payments. Influencer income is taxed. For MVP: **we do not deduct WHT** but we provide a **year-end earnings report** to creators and **log all transactions** for FBR compliance. Creators are responsible for their own tax filing. Add a tax disclaimer during onboarding.
- **FBR reporting:** All transactions over PKR 50,000 reported monthly (if legally required). Consult a tax advisor before launch.
- **CNIC required** for withdrawals over PKR 100,000 (per SBP / FBR guidelines).
- **Data localization:** Store all PK user data on PK-hosted servers (Supabase PK region or local hosting).
- **Business registration:** Register Creators Circle as a marketplace with SECP and obtain NTN.

### Security

- **2FA** for brand logins (optional v1, mandatory v2 for high-value accounts)
- **Phone OTP** required for every withdrawal
- **Rate limits:** max 3 withdrawals/day per creator, max PKR 500K/day (configurable)
- **Anomaly detection:** flag sudden withdrawal pattern changes
- **Escrow held in separate bank account** (not operating account) for legal clarity
- **Audit log** of every transaction for 7 years (regulatory requirement)

### Tech implementation

- **Custom ledger** in PostgreSQL (double-entry bookkeeping — every transaction has matching debit + credit)
- **Idempotency keys** on every payment operation (prevents double-charging on retries)
- **Webhook handlers** for JazzCash / EasyPaisa / bank callbacks (signed, verified, idempotent)
- **Reconciliation job** (daily, matches our ledger with gateway reports — flags discrepancies)
- **Payout queue** for batch processing of withdrawals (run hourly, with manual approval for > PKR 100K)
- **Event sourcing** for full audit trail of every state change (every ledger entry is an immutable event)

### Revenue model

| Stream | Timing | Expected weight |
|---|---|---|
| 10% commission on contracts | Per milestone | Primary, ~95% of revenue |
| Premium creator listings (boost placement in search) | Optional, v2 | ~3% |
| Brand subscriptions (advanced analytics, multiple seats) | Optional, v2 | ~2% |
| Sponsored niche placements | Optional, v2+ | <1% |

**Break-even math:** at PKR 50K average contract and 100 contracts/month, that's PKR 5M GMV → PKR 500K commission. Need 1,000+ contracts/month to make this a sustainable business. Realistic for year 2 if we nail the cold start and unit economics.

---

## 17. Open questions (decisions I need from you)

1. **Mobile strategy** — ✅ Locked: single app with role switcher
2. **Payment model** — ✅ Locked: both (pre-funded wallet AND pay-per-contract, brand's choice)
3. **Commission payer** — ✅ Locked: creator only (creator gets 90% of agreed amount)
4. **Analytics depth for MVP** — ✅ Locked: full custom dashboards from day 1
5. **First brand for pilot** — open (do you have a brand in mind to test with before public launch?)
6. **First 5-10 creators** — open (do you have influencer connections to seed the supply side?)

---

## 18. Onboarding flows

### Creator onboarding (mobile + web)

**Goal:** get from sign-up to a useful profile in under 5 minutes.

| Step | Field | Required | Notes |
|---|---|---|---|
| 1 | Phone number (OTP) | Yes | Primary identifier; Supabase Auth phone OTP |
| 2 | Choose role | Yes | "I'm a creator" / "I'm a brand" (one-time pick) |
| 3 | Name + handle | Yes | Real name + public handle (unique, @-style) |
| 4 | Link Instagram | Yes | OAuth via Instagram Graph API; auto-pulls followers, engagement, audience |
| 5 | Link YouTube | Yes | OAuth via YouTube Data API; auto-pulls subscribers, views, audience |
| 6 | Niche tags (1-5) | Yes | Multi-select from 12 primary + 6 extended |
| 7 | Languages | Yes | Multi-select (Urdu, English, Punjabi, Sindhi, Pashto) |
| 8 | City | Yes | Dropdown (KHI, LHE, ISB, FSD, plus "Other") |
| 9 | Rate card (per post, per reel, per video) | Yes | Default suggestions based on follower count (e.g., PKR 1 per follower for posts) |
| 10 | Bio (1-2 sentences) | Yes | Character limit 280 |
| 11 | Optional: CNIC for verification | No | Boosts visibility + unlocks higher-value contracts; required for withdrawals > PKR 100K |
| 12 | Optional: portfolio samples | No | Up to 6 image/video links to past content |
| 13 | Optional: past brand collabs | No | Auto-filled from IG/YT tagged posts if API allows |
| 14 | Optional: invite code | No | Skips onboarding to "verified" tier if a brand invites them |
| 15 | Done → /creator/dashboard | — | Confetti, first-time tutorial overlay |

**Progressive disclosure:** only required fields block. Optional fields can be added anytime. The dashboard shows a "% complete" indicator until 100%.

**Skip options:** if a creator signs up but only completes steps 1-3, they show in search with a "Profile incomplete" badge. They get reminder nudges via push + email to complete the rest.

### Brand onboarding (mobile + web)

| Step | Field | Required | Notes |
|---|---|---|---|
| 1 | Phone number (OTP) | Yes | Supabase Auth phone OTP |
| 2 | Choose role | Yes | "I'm a creator" / "I'm a brand" |
| 3 | Company name | Yes | Display name + legal name (legal name required for invoicing) |
| 4 | Industry | Yes | Dropdown (Fashion, Beauty, Food, Tech, Education, Finance, Other) |
| 5 | NTN (National Tax Number) | Yes | For invoicing + FBR reporting |
| 6 | Website + logo | Yes | URL + image upload |
| 7 | Typical monthly creator budget | Yes | Tier selector (PKR 50K-100K, 100K-500K, 500K+) — affects recommendations |
| 8 | Preferred niches | Yes | Multi-select (so we can recommend creators) |
| 9 | Billing contact | Yes | Name + email + phone (for invoices and refunds) |
| 10 | Optional: team members | No | Invite by email; multiple seats available in v2 |
| 11 | Done → /brand/dashboard | — | Confetti, first-time tutorial overlay |

### First-time UX (both roles)

- **Tutorial overlay** on first dashboard visit (3-4 tooltips on key features, dismissible)
- **Empty states** on every list (e.g., "No contracts yet — here's how to find a creator")
- **Sample data** toggle (admin-controlled) so the user can see what a populated dashboard looks like
- **Sample creator profiles** in the database for the first month, so a brand's first search has results to react to

---

## 19. Search & discovery

### Brand-side search (find creators)

**Default ranking** (when a brand searches for creators):

1. **Match score** — niche match, city match, language match, follower count in target range, engagement > 3%, verified
2. **Engagement rate** (higher is better, weight 0.3)
3. **Past collaboration count** (proves reliability, weight 0.2)
4. **Brand rating** (if available, weight 0.3)
5. **Recency** (active in last 30 days, weight 0.1)
6. **Response rate** (creator responsiveness, weight 0.1)

**Filters (faceted):**

| Filter | Type | Source |
|---|---|---|
| Niche | Multi-select chips | 12 primary + 6 extended |
| Platform | Checkboxes (Instagram, YouTube) | Linked social accounts |
| Follower count | Range slider (0-10K, 10K-100K, 100K-500K, 500K-1M, 1M+) | Social account stats |
| Engagement rate | Range slider (0-2%, 2-5%, 5%+) | Computed from social stats |
| City | Multi-select | Profile field |
| Languages | Multi-select | Profile field |
| Rate range | Range slider (PKR 0-50K, 50K-200K, 200K+) | Rate card |
| Verified | Toggle | Verification status |
| Available now | Toggle | Availability field |
| Past brand work | Toggle | BrandCollab count > 0 |

**Sort options:** Best match (default), Highest engagement, Most followers, Lowest rate, Most reviews.

**Save search:** brands can save a search with a name (e.g., "Karachi fashion micro-influencers") and get notified when new matching creators join.

**Shortlist:** brands can add creators to a named shortlist (e.g., "Q4 campaign candidates") and compare side-by-side (up to 4 creators in a comparison view).

### Creator-side search (find campaigns)

**Default ranking:** by niche match, budget, brand rating, recency.

**Filters:** niche, platform, budget range, city, brand industry, deadline.

**Save search** and **recommended campaigns** (niche-matched, sent via push weekly).

---

## 20. Verification & trust

### Creator verification tiers

| Tier | How to unlock | Perks |
|---|---|---|
| **Unverified** | Just sign up | Can apply to campaigns; shown in search with a "unverified" badge |
| **Basic** | Link 1+ social account + complete profile | "Basic verified" badge; visible in search |
| **Verified** | Submit CNIC + portfolio audit by admin | "Verified" badge (purple); eligible for higher-value contracts; ranked higher in search |
| **Pro** | 5+ completed contracts + 4.5+ rating + admin approval | "Pro" badge (gradient); top placement; invited to premium campaigns |

### Brand verification tiers

| Tier | How to unlock | Perks |
|---|---|---|
| **Unverified** | Sign up + complete profile | Can browse + message creators (cannot fund contracts) |
| **Verified** | Submit NTN + business proof | Can fund contracts; "Verified brand" badge visible to creators |
| **Enterprise** | Annual contract + admin approval | Dedicated success manager; custom contract terms; bulk hiring tools |

### Verification flow (creator)

1. Submit CNIC front + back + selfie
2. Auto-check (file format, blur detection, expired document check)
3. Manual review by admin (24-48h SLA)
4. Approve or reject (with reason)
5. On approval: badge appears on profile, ranking boost applied

### Verification flow (brand)

1. Submit NTN + business proof (utility bill, business registration)
2. Auto-check (NTN format, business registry lookup if available)
3. Manual review by admin (24-48h SLA)
4. Approve or reject (with reason)
5. On approval: badge appears, can fund contracts

### Trust signals (everywhere)

- Verified badge (purple) on profile cards
- Pro badge (gradient) for top creators
- "Audience authenticity checked" badge (after bot detection)
- Brand rating (1-5 stars) on profile
- Response rate indicator (e.g., "Usually replies within 4h")
- Completion rate (e.g., "98% contract completion")
- Past brand logos on profile (with permission)

---

## 21. Notifications system

### Channels

- **In-app** (always on, free)
- **Push notifications** (Expo Push, opt-in)
- **Email** (Resend, opt-out for marketing only — transactional always on)
- **SMS** (transactional only — withdrawal OTP, security alerts, Twilio)

### Notification events

| Event | In-app | Push | Email | SMS |
|---|---|---|---|---|
| Brand invites creator to a campaign | ✓ | ✓ | ✓ | — |
| Creator applies to your campaign | ✓ | ✓ | ✓ | — |
| Milestone submitted for review | ✓ | ✓ | ✓ | — |
| Milestone approved | ✓ | ✓ | ✓ | — |
| Revision requested | ✓ | ✓ | ✓ | — |
| Contract cancelled | ✓ | ✓ | ✓ | — |
| Dispute opened | ✓ | ✓ | ✓ | — |
| Funds added to wallet | ✓ | — | ✓ | — |
| Withdrawal requested | ✓ | — | ✓ | — |
| Withdrawal completed | ✓ | ✓ | ✓ | — |
| New message | ✓ | ✓ | — | — |
| New campaign matching your niches | ✓ | ✓ (weekly digest) | ✓ (weekly) | — |
| Profile view spike | ✓ | — | ✓ (daily digest) | — |
| Security alert (new device, password change) | ✓ | — | ✓ | ✓ |

### Preferences

- In-app: always on
- Push: per-event opt-in
- Email: per-event opt-out (transactional events cannot be disabled)
- SMS: per-event opt-in

---

## 22. Go-to-market plan

### Phase 0 — Pre-launch (Weeks -4 to 0)

- Brand identity locked (done: Creators Circle, Creator-Pop)
- Plan + tech stack + design system (done: this document)
- Domain selected and registered for Creators Circle (pending availability check)
- Trademark check filed (IPO Pakistan)
- Business registered (SECP, NTN obtained)
- Bank account opened for escrow
- Payment gateway accounts: JazzCash merchant, EasyPaisa merchant
- 5-10 brand partners confirmed (target: D2C fashion, beauty, F&B)
- 50-100 creator profiles seeded (manual outreach — see below)

### Phase 1 — Closed beta (Weeks 0-4)

- 50-100 creators + 5-10 brands
- Manual onboarding (you personally walk each creator through profile setup)
- WhatsApp community for creators (real-time support)
- Weekly check-in calls with brand partners
- Daily metrics review: activations, contracts, GMV, churn

**Seeding creators (the hardest part):**

The only way to escape the chicken-and-egg trap is **direct outreach to influencers you (or your network) already know.** Recommendations:
1. Start with your own network — any influencer friends, family, colleagues
2. Reach out to mid-tier creators (10K-100K followers) who are clearly hustling for brand deals — they're the target market
3. Offer them free "Creators Circle Verified" profile + first 3 contracts fee-free (in exchange for being on the platform at launch)
4. Get 1-2 micro-influencer friends to be visible early adopters and case studies
5. Don't try to land a 1M+ follower creator in week 1 — they have agencies, this is for the long tail

**Seeding brands:**

1. Start with your own network — any brand owners, marketing managers, agency contacts
2. D2C brands on Instagram (lookalike audience) — direct DM with a free first campaign
3. Local agencies in KHI / LHE — offer a revenue share for bringing their creators onto the platform

### Phase 2 — Public launch (Week 4+)

- Press release (ProPakistani, Dawn, TechJuice)
- Instagram launch campaign (organic + paid)
- Creator referral program (PKR 5K for each successful referral)
- Brand referral program (PKR 10K wallet credit for each brand that funds a contract)
- First batch of case studies (3-5 success stories)
- "Top 100 Pakistani creators" list (annual content piece, PR + SEO play)

### Phase 3 — Growth (Month 3+)

- SEO play: "best Pakistani fashion influencers", "[city] food vloggers", etc. — programmatic landing pages
- Influencer-led growth: top creators invite their friends
- Brand sales team (1-2 SDRs) for enterprise brands
- Community events (creator meetups in KHI / LHE)
- Content marketing (blog, podcast, case studies)
- Paid acquisition (Instagram + Google ads, once unit economics work)

---

## 23. Success metrics

### 3 months post-launch

- 500 creators onboarded (50% with completed profiles)
- 50 brands onboarded (80% verified)
- 100 contracts funded
- PKR 5M GMV
- 10% commission = PKR 500K revenue
- <10% dispute rate
- <5% monthly churn (creators)

### 6 months

- 2,000 creators
- 200 brands
- 1,000 contracts
- PKR 50M GMV
- PKR 5M revenue
- 4.5+ average brand rating

### 12 months

- 5,000 creators
- 1,000 brands
- 5,000+ contracts/year
- PKR 250M+ GMV
- PKR 25M+ revenue
- Profitable (assuming 70% gross margin, ~PKR 17M operating costs)

---

## 24. Operational & delivery decisions (locked 2026-09-09)

### Domain

**Pending after the Creators Circle rename.** Select an available domain that matches the new name. Domain availability and registration have not been verified; the previous name's domain decision is superseded.

### Languages at launch

**✅ English only for v1. Urdu in v2** (after product-market fit is confirmed). Saves ~2-3 weeks of dev (no translation pipeline, no RTL review, no Urdu-only content variants). Tradeoff: excludes Urdu-first creators from launch — acceptable because the brand-buyer persona reads English, and most Pakistani IG/YT creators post in English or bilingual.

When Urdu ships in v2, the technical approach is:
- `next-intl` for web
- `i18next` + `react-i18next` for React Native
- Locale stored on user profile (`User.lang`)
- Auto-detect from browser/device, overrideable in settings
- Translations managed in code (JSON files), no external TMS for v1

### Platforms (expanded from 2 to 4)

**✅ Instagram + YouTube + TikTok + Facebook** — all four from day 1.

Implication: this roughly doubles the social-auth integration effort vs the original 2-platform plan. Each platform has its own OAuth, API surface, and rate limits.

| Platform | API | Use case | Access |
|---|---|---|---|
| **Instagram** | Graph API (`instagram_basic`, `instagram_manage_insights`) | Followers, engagement, audience demographics, post performance | Meta Business verification needed |
| **YouTube** | Data API v3 | Subscribers, avg views, watch time, audience demographics | Free with quota (10K units/day default, can request increase) |
| **TikTok** | TikTok for Business API + Login Kit | Followers, engagement, video performance | **Requires TikTok business partnership** (4-8 week approval) |
| **Facebook** | Graph API for Pages | Page likes (follower equivalent), post engagement | Standard Meta Business verification |

**For TikTok specifically**: if business partnership isn't approved by launch, ship Instagram + YouTube + Facebook in v1, add TikTok in v2 (it's still creator demand, just not the platform's fastest path).

### Build mode

**✅ Solo builder. I (Mavis) build the entire MVP. You direct and approve.**

You don't have a separate dev team — I am the engineer. My deliverables for every chunk:
- Production-ready code
- Local previews you can open in a browser
- Explicit approval request before I commit, push, or deploy
- Architectural decisions surfaced for your review (with rationale)

My workflow for every chunk:
1. Plan the chunk (sub-tasks, files to create, acceptance criteria)
2. Show you the plan, get your approval
3. Build it
4. Show you the result (screenshot, file, or local preview)
5. Get your approval
6. Move to next chunk

I never commit, push, deploy, or register domains without your explicit go-ahead. This is consistent with your standing "approval-required workflow" preference.

---

## 25. Build-ready checklist

Before we start any code, the plan needs to be ✅ on these:

| Section | Status | Notes |
|---|---|---|
| §1 One-liner | ✅ | Locked |
| §2 Positioning | ✅ | Locked |
| §3 Honest concern | ✅ | Documented, accepted with mitigation |
| §4 Personas | ✅ | Locked |
| §5 Differentiator stack | ✅ | Locked |
| §6 MVP scope | ✅ | Locked |
| §7 Tech stack | ✅ | Locked |
| §8 Data model | ✅ | Locked |
| §9 Payment flow | ✅ | Locked |
| §10 Information architecture | ✅ | Locked |
| §11 Risks | ✅ | Documented |
| §12 Decisions log | ✅ | All locked |
| §13 What we will NOT build | ✅ | Locked |
| §14 Dual-portal architecture | ✅ | Locked |
| §15 Analytics system | ✅ | Locked |
| §16 Payment system | ✅ | Locked |
| §17 Open questions | ✅ | All locked |
| §18 Onboarding flows | ✅ | Locked |
| §19 Search & discovery | ✅ | Locked |
| §20 Verification & trust | ✅ | Locked |
| §21 Notifications | ✅ | Locked |
| §22 GTM plan | ✅ | Locked |
| §23 Success metrics | ✅ | Locked |
| §24 Operational & delivery decisions | ✅ | Locked 2026-09-09 |

### Items deferred to implementation (not blocking planning)

- Specific email templates (drafted during build)
- Exact dispute flow UI (designed during build)
- Admin tools (built alongside other features)
- Legal docs (Terms, Privacy, Creator/Brand Agreement) — drafted with a PK lawyer before launch
- Exact database migrations (Prisma handles this during build)
- Specific error messages, empty states (designed during build)
- iOS / Android submission assets (built during launch prep)

### Items you should personally handle (not blocking planning)

- Trademark check (IPO Pakistan)
- Business registration (SECP, NTN)
- Bank account for escrow
- JazzCash / EasyPaisa merchant applications
- First 5-10 brand partners (outreach)
- First 50-100 creator profiles (outreach)
