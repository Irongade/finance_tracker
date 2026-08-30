# Ade & P Finance Tracker

A two-user household finance web app that replicates the v2 spreadsheet exactly: same data, same calculations, same monthly routine, online and mobile-friendly. The full specification is in [`docs/SPEC.md`](docs/SPEC.md) (v1.2).

## Status: phase 2 - real backend

Phase 1 built every page in spec §7.4 on an in-memory store. Phase 2 replaced the store with the real stack:

- **Postgres + Drizzle** (`src/server/db/`): §4 schema, SQL migrations in `drizzle/`, money as bigint pence, every row scoped to a household.
- **Better Auth** (`src/server/auth/`): email + password (scrypt), 30-day rolling httpOnly session, login rate-limited to 5/min (database-backed), CSRF via origin checks. No public signup: the first account creates the household, the second joins through a one-time invite link (48 h, hash-only storage). Password fields have a show/hide toggle.
- **Layers** (§6.1): `app/api/**/route.ts` thin controllers -> `src/server/services/` (invariants, `db.transaction`, typed errors) -> `src/server/repositories/` (the only Drizzle importers) -> `src/server/calc/` (pure §5 engine, unchanged from phase 1).
- **REST API** (§6): CRUD for every collection plus the computed reads (`/api/dashboard`, `/api/my-money/:id`, `/api/budgets?start=`, `/api/forecast`, `/api/settle-up`, `/api/investments`). Every mutation returns the entity **and** the recomputed household so the UI never refetches.
- **Client** (`src/store/household-store.tsx`): the `(app)` layout loads the household on the server in one round trip and hydrates the store; pages read synchronously; mutations are optimistic (same calc engine as the server), coalesced for inline edits, and reconciled with the server's copy. The tab refreshes on focus and every minute so both of you see the same data.
- **Import** (§11): `src/server/import/workbook.ts` parses the v2 xlsx with SheetJS (by header labels, not cell addresses); used by onboarding's upload step and by `pnpm db:seed`.
- **Tests**: 23 golden tests (§12) on the engine, parser tests on the real workbook, a repository integration test against Postgres (migrates a test DB, imports, checks the golden dashboard and invariants), Playwright e2e for flows 1-3 (`e2e/flows.spec.ts`).
- **Ops**: GitHub Actions CI (`lint`, `typecheck`, `test`, migrate, build, e2e), nightly `pg_dump` workflow with 30-day retention, restore steps in `docs/RUNBOOK.md`.

Not yet: Vercel/Neon deployment (needs your accounts), TanStack Query (the store's own optimistic dispatch does the job; noted as a deviation from §7.1).

## Run it

```bash
pnpm install
cp .env.example .env.local     # set BETTER_AUTH_SECRET (openssl rand -base64 32)
createdb finance_tracker && createdb finance_tracker_test   # Postgres.app binaries are under /Applications/Postgres.app/Contents/Versions/latest/bin
pnpm db:migrate
pnpm db:seed                   # ade@example.com / p@example.com, password123 (see .env.example)
pnpm dev                       # http://localhost:3000 -> sign in

pnpm test                      # Vitest: golden, parser, Postgres integration (uses DATABASE_URL_TEST)
pnpm typecheck                 # next typegen + tsc
pnpm lint                      # Biome
pnpm build
FIXED_TODAY=2026-08-28 pnpm dev & BASE_URL=http://localhost:3000 pnpm test:e2e   # Playwright flows against the seeded DB
```

`FIXED_TODAY=YYYY-MM-DD` pins "today" (Europe/London otherwise); the golden numbers assume 28 Aug 2026.

## Layout

```
docs/SPEC.md                 the specification (source of truth)
data/                        the v2 workbook (gitignored)
src/domain/                  types (§4/§5 shapes), money + date helpers, Zod schemas (§9), sentences
src/server/calc/             §5 calculation engine: pure, clock-injected, golden-tested
src/mock/fixtures.ts         workbook fixtures for the golden tests
src/store/                   client store: server-hydrated, optimistic dispatch to /api
src/server/db/               drizzle client, schema, migrations (drizzle/)
src/server/auth/             Better Auth config (invite-gated sign-up)
src/server/repositories/     Drizzle queries, one per aggregate, domain types out
src/server/services/         business rules, transactions, typed errors
src/server/import/           SheetJS workbook parser
src/app/api/                 route handlers (thin controllers)
e2e/                         Playwright flows; scripts/seed.ts seeds from data/*.xlsx
src/components/ui/           shadcn primitives (radix)
src/components/domain/       MoneyText, MoneyInput, chips, PersonBadge, KpiCard, LedgerSentence, QuickAddSheet, ...
src/components/shell/        sidebar, bottom tabs, quick-add button, user menu
src/app/(app)/               the 14 app pages
src/app/(auth)/              login, register, invite, onboarding (Better Auth + /api/household)
scripts/screenshots.mjs      Playwright visual smoke
```

## Spec clarifications made while building

- **Personal bills have no due date in the workbook.** `bills.due_day` is nullable; a bill without one shows "No due date" and is excluded from the overdue count, which keeps the golden "5 Overdue".
- **Person accents for text.** `#2E8FA3` / `#8A4FBE` fail AA for small text on light backgrounds, so they are used for avatars and chart series, with darker `ade-ink` / `p-ink` shades for chip text.
- **Better Auth owns the user table.** The `users` entity maps onto Better Auth's `user` + `account` tables in phase 2 rather than a separate `password_hash` column.
