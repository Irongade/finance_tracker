@AGENTS.md

# Ade & P Finance Tracker

Spec: `docs/SPEC.md` (v1.2) is the source of truth; the v2 workbook in `data/` (gitignored) is the functional reference and the seed.

## Commands
- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm test` — Vitest; `src/server/calc/__tests__/golden.test.ts` is the §12 acceptance table and must stay green
- `pnpm typecheck` — runs `next typegen` first (generates `LayoutProps`/`PageProps`)
- `pnpm lint` — Biome (120 cols; `src/components/ui` is excluded)
- `BASE_URL=http://localhost:3000 node scripts/screenshots.mjs` — Playwright visual smoke

## Conventions
- Money is integer pence end to end; render only through `MoneyText` / `AnimatedMoney`, input only through `MoneyInput`. A raw number rendered anywhere is a review failure.
- All §5 maths lives in `src/server/calc/` (pure, clock-injected, no I/O). UI and (later) services call it; never re-derive a figure in a component.
- Domain types in `src/domain/types.ts`; validation in `src/domain/schemas.ts` (Zod, shared by forms and controllers).
- Design tokens are CSS variables in `src/app/globals.css` (§7.2); use the named colours (`navy`, `blue`, `mint`, `fern`, `blush`, `brick`, `butter`, `amber`, `ade-teal`, `p-plum`, ...) rather than hex or Tailwind palette colours.
- Statuses use the workbook's words: Paid, Due, OVERDUE, On track (+£58), Behind by £58.
- Phase 1 (current) runs on the in-memory `HouseholdProvider` in `src/mock/store.tsx`; phase 2 replaces it with services/repositories per §6.1 without touching the calc engine.
