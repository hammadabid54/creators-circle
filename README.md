# Creators Circle

Where Pakistani creators and brands meet.

A monorepo for the Creators Circle platform — discovery and collaboration for Pakistani Instagram, YouTube, TikTok, and Facebook creators. See [PLAN.md](./PLAN.md) for the full product plan.

## Structure

```
anjuman/
├── apps/
│   ├── web/                # Next.js 15 web app (App Router)
│   └── mobile/             # React Native (Expo) iOS + Android
├── packages/
│   ├── config/             # Shared ESLint + TypeScript config
│   ├── ui/                 # Shared component library (chunk 1B)
│   └── types/              # Shared TypeScript types (chunk 1B)
├── branding/               # Design mockups (HTML + screenshots)
└── PLAN.md                 # Product plan and locked decisions
```

## Tech stack

- **Web**: Next.js 15 (App Router), TypeScript, Tailwind v4
- **Mobile**: React Native (Expo SDK 52), TypeScript
- **Build orchestration**: Turborepo + pnpm workspaces
- **Backend** (chunk 1D): Supabase (Postgres + Auth + Realtime), Prisma ORM
- **Payments** (chunk 1F+): JazzCash, EasyPaisa, bank transfer
- **Hosting**: Vercel (web), Expo EAS (mobile)

## Development

Requires Node 20+. pnpm is invoked via `npx pnpm@latest` (no global install needed).

```bash
npx pnpm@latest install
npx pnpm@latest dev          # run all apps
npx pnpm@latest dev --filter @anjuman/web   # web only
```

## Scripts

- `dev` — run all apps in dev mode
- `build` — build all apps
- `lint` — lint all packages
- `typecheck` — typecheck all packages
- `clean` — clean all build outputs

## Current build phase

**Phase 1A complete** — monorepo scaffold. See PLAN.md §6 for the full roadmap.
