# Ade & P Finance Tracker

A two-user household finance web app that replicates the v2 spreadsheet exactly: same data, same calculations, same monthly routine, online and mobile-friendly. The full specification is in [`docs/SPEC.md`](docs/SPEC.md) (v1.2).

## Status: UI mock-up (phase 1)

Every page in spec §7.4 is built and navigable, running on an **in-memory store** seeded from the workbook (`src/mock/`). The numbers are not hard-coded: the pure calculation engine from §5 (`src/server/calc/`) computes them from the seed, and the §12 golden tests pass against it. The backend (Postgres, Drizzle, Better Auth, REST API) is phase 2; the calc engine and Zod schemas carry over unchanged.

What is mocked and how:

| Area | Mock-up behaviour | Phase 2 |
|---|---|---|
| Data | `HouseholdProvider` (React context + reducer), resets on reload | Postgres via services/repositories, server components |
| Auth | `/login`, `/register`, `/invite`, `/onboarding` are static screens; the user menu switches between Ade and P | Better Auth, session cookie, invite tokens |
| Clock | Fixed at **28 Aug 2026** (the golden-test date) so the demo matches the workbook | Europe/London today |
| Import | Onboarding shows the import step; `data/*.xlsx` is gitignored | SheetJS seed script (§11) |

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # §12 golden tests (Vitest)
pnpm typecheck    # next typegen + tsc
pnpm lint         # Biome
pnpm build
BASE_URL=http://localhost:3000 node scripts/screenshots.mjs   # visual smoke, needs `pnpm exec playwright install chromium`
```

Local Postgres (Postgres.app, v18) is ready for phase 2 at `postgresql://localhost:5432`.

## Layout

```
docs/SPEC.md                 the specification (source of truth)
data/                        the v2 workbook (gitignored)
src/domain/                  types (§4/§5 shapes), money + date helpers, Zod schemas (§9), sentences
src/server/calc/             §5 calculation engine: pure, clock-injected, golden-tested
src/mock/                    seed fixtures from the workbook + the in-memory store (phase 1 only)
src/components/ui/           shadcn primitives (radix)
src/components/domain/       MoneyText, MoneyInput, chips, PersonBadge, KpiCard, LedgerSentence, QuickAddSheet, ...
src/components/shell/        sidebar, bottom tabs, quick-add button, user menu
src/app/(app)/               the 14 app pages
src/app/(auth)/              login, register, invite, onboarding
scripts/screenshots.mjs      Playwright visual smoke
```

## Spec clarifications made while building

- **Personal bills have no due date in the workbook.** `bills.due_day` is nullable; a bill without one shows "No due date" and is excluded from the overdue count, which keeps the golden "5 Overdue".
- **Person accents for text.** `#2E8FA3` / `#8A4FBE` fail AA for small text on light backgrounds, so they are used for avatars and chart series, with darker `ade-ink` / `p-ink` shades for chip text.
- **Better Auth owns the user table.** The `users` entity maps onto Better Auth's `user` + `account` tables in phase 2 rather than a separate `password_hash` column.
