# Ade & P Finance Tracker - Web App Specification v1.2

A two-user household finance web app that replicates the v2 spreadsheet exactly: same data, same calculations, same monthly routine, but online, mobile-friendly, and saved to a database. The spreadsheet is the functional source of truth; where this spec deviates or adds, it is listed in sections 2.3 and 2.4.

---

## 1. Goals and non-goals

**Goals**
- Log a transaction from a phone in under 10 seconds, from anywhere
- One shared household: both users see the same data live
- Every number the spreadsheet computes, the app computes identically (see 5, verified by golden tests in 12)
- Month-end ritual (pot balances, everyday balances) takes under 5 minutes

**Non-goals for v1**
- Bank feeds / open banking (manual entry, same as the sheet)
- More than 2 users or more than 1 household
- Multi-currency (GBP only), notifications, native apps, dark mode

## 2. Scope

### 2.1 Feature parity map (spreadsheet tab -> app)
| Spreadsheet tab | App surface |
|---|---|
| Unified Dashboard | Dashboard page |
| Transactions Log | Transactions page + global quick-add |
| Shared Goals & Bills | Goals page, Bills page |
| Ade Tracker / P Tracker | My Money page (per-user, same component) |
| Monthly Spending | Budgets page (12-month matrix) |
| Balances | Pots page (month-end snapshots) |
| Monthly Forecast | Forecast page |
| Debts | Debts page |
| Net Worth | Net Worth page |
| Settings | Settings page |
| Read Me | First-run onboarding + help panel |
| (not in the spreadsheet) | Investments page (new in v1.1) |

### 2.2 Core behaviours carried over unchanged
- Split methods: 50 / 50, Proportional to income, Custom
- Settle-up from shared costs paid from personal accounts; joint payments and transfers excluded
- Bill status Paid / Due / Overdue per calendar month
- Goal engine: per-person pledges, LISA 25% bonus with monthly cap, Required £/mo, "Behind by £X" / "On track (+£X)"
- Saved-so-far anchored to the latest pot balance snapshot, never to pledges
- 24-month forecast: balance x (1 + AER/12) + monthly add (incl bonus)
- Fixed budgets derived from the bills tables; variable budgets user-set
- Leftover waterfall per person; household leftover; LISA bonus shown as "free money on top"
- Emergency fund months-of-cover check; house affordability block; net worth

### 2.3 Deliberate deviations (kept small)
1. **Bill payment linking.** The sheet fuzzy-matches the bill name inside the description. The app links a transaction to a bill explicitly (optional dropdown on the add form, pre-selected when the description contains a bill name). More reliable, same outcome.
2. **Settlements.** The sheet's settle-up balance can only grow. The app adds a "Settle up" action that records a payment between the two of you and nets it off.
3. **Emergency fund flag.** The sheet finds the fund by the literal name "General Savings". The app uses an `is_emergency_fund` boolean on a goal.
4. **Auth.** Two password-protected accounts (the sheet had none).
Everything else is parity.

### 2.4 Addition: Investments (new, not in the spreadsheet)
The sheet tracked savings pots only. v1.1 adds investment tracking at **account level** (S&S ISA, pension, GIA, crypto), deliberately not per-holding: you type a value snapshot at month end, exactly like Pots, and log contributions as linked transfer transactions. That gives value, contributed, gain/loss, a growth-based projection, and inclusion in net worth and the leftovers, with no price feeds and no extra routine. Per-holding tracking with live prices stays in section 13.

## 3. Users and auth

- Exactly two user accounts (Ade, P) in one household. No public signup: the first user registers, then generates a one-time invite link for the second.
- Email + password via Better Auth (built-in hashing, scrypt by default). Session: httpOnly secure cookie, 30-day rolling expiry. CSRF protection on mutations. Login rate-limited (5/min/IP).
- Both users have identical permissions. Every record is scoped to the household.
- "My Money" defaults to the logged-in user but either person can view the other's tab (matches the spreadsheet, where nothing is hidden).

## 4. Data model (PostgreSQL)

All money stored as integer pence (`bigint`). All tables carry `id uuid pk`, `household_id`, `created_at`, `updated_at`. Enums shown inline.

```sql
users            (name text, email citext unique, password_hash text)
households       (name text)  -- one row in practice
settings         (split_method enum('fifty_fifty','proportional','custom'),
                  custom_share_user1 numeric(5,4),      -- 0..1
                  lisa_bonus_rate numeric(5,4),          -- 0.25
                  lisa_annual_allowance_pence bigint,    -- 400000
                  mortgage_multiple numeric(4,2))        -- 4.5
categories       (name text, type enum('fixed','variable','transfer'),
                  sort int, archived bool default false)
income_sources   (user_id fk, name text, monthly_pence bigint)
bills            (name text, category_id fk, monthly_pence bigint,
                  due_day int check 1..31,
                  owner enum('joint','user') , owner_user_id fk null,
                  notes text, archived bool)
goals            (name text, type enum('lisa','standard'),
                  target_pence bigint, target_date date,
                  aer numeric(6,4) default 0, is_emergency_fund bool,
                  notes text, sort int, archived bool)
goal_pledges     (goal_id fk, user_id fk, monthly_pence bigint,
                  unique(goal_id,user_id))
transactions     (date date, description text, category_id fk,
                  amount_pence bigint,             -- negative = refund
                  paid_by enum('user','joint'), paid_by_user_id fk null,
                  is_shared bool,
                  share_override numeric(5,4) null, -- user1's share of THIS txn
                  linked_bill_id fk null, linked_goal_id fk null,
                  linked_investment_id fk null, notes text)
settlements      (date date, from_user_id fk, to_user_id fk,
                  amount_pence bigint, notes text)
pot_snapshots    (goal_id fk, month date,          -- first of month
                  balance_pence bigint, unique(goal_id,month))
accounts         (name text, owner enum('joint','user'),
                  owner_user_id fk null, balance_pence bigint)
net_worth_snapshots (month date unique, value_pence bigint)
debts            (owner_user_id fk, lender text, balance_pence bigint,
                  apr numeric(6,4), min_payment_pence bigint,
                  extra_payment_pence bigint)
investment_accounts (name text, provider text,
                  wrapper enum('ss_isa','pension','gia','crypto','other'),
                  owner enum('joint','user'), owner_user_id fk null,
                  monthly_contribution_pence bigint default 0,
                  expected_growth numeric(6,4) default 0,   -- annual
                  contributed_before_pence bigint default 0,
                  notes text, archived bool default false)
investment_snapshots (account_id fk, month date,   -- first of month
                  value_pence bigint, unique(account_id,month))
variable_budgets (category_id fk unique, monthly_pence bigint)
```

Indexes: `transactions(date)`, `transactions(category_id)`, `pot_snapshots(goal_id, month desc)`. Transaction `type` is never stored; it is always `category.type` (renaming or retyping a category retroactively reclassifies, same as the sheet).

## 5. Calculation engine (server-side, pure functions, unit-tested)

Nothing below is ever stored; all derived on read. "user1" = Ade throughout; user2's share is always `1 - share1`.

**5.1 Effective share (share1)**
- fifty_fifty -> 0.5
- proportional -> income1 / (income1 + income2), fallback 0.5 if both zero, where income = sum of that user's income_sources
- custom -> settings.custom_share_user1

**5.2 Transaction classification.** effective type = category.type. Spending = fixed + variable. Transfers are never spending.

**5.3 Settle-up (all time)**
For every transaction where `is_shared AND paid_by = user AND type != transfer`:
- fair1 = amount x (share_override ?? share1)
- paid1 = amount if paid_by_user = user1 else 0
net = SUM(paid1) - SUM(fair1) - SUM(settlements user2->user1) + SUM(settlements user1->user2)
- net > 0 -> "P owes Ade £net"; net < 0 -> "Ade owes P £|net|"; |net| < £0.01 -> "All square"
Joint-paid rows contribute nothing (already fair).

**5.4 Bills, current calendar month**
- due_date = date(year, month, min(due_day, days_in_month))
- paid = a transaction exists this month with linked_bill_id = bill (or, fallback, description contains bill name, case-insensitive)
- status = Paid if paid; else Overdue if today > due_date; else Due
- total_joint_bills = SUM(bills where owner=joint); personal_bills(u) = SUM(bills where owner_user=u)

**5.5 Goal engine (per goal)**
- saved = latest pot_snapshot.balance for the goal (0 if none)
- pledge_total = SUM(goal_pledges)
- lisa_bonus = type=lisa ? min(pledge_total, allowance/12) x bonus_rate : 0
- months_left = max(0, (target.year - today.year) x 12 + target.month - today.month)
- required = months_left = 0 ? max(0, target - saved) : max(0, target - saved) / months_left
- status: pledge_total + lisa_bonus >= required -> "On track (+£d)" else "Behind by £d", d = |difference| rounded to whole £
- LISA warning per user: that user's pledge on a lisa goal > allowance/12 -> red "breaches £4,000/yr allowance"

**5.6 Person snapshot (per user u)**
- income(u) = SUM(income_sources)
- share_of_joint(u) = share(u) x (total_joint_bills + total_variable_budget)
- pledges(u) = SUM(goal_pledges where user=u)
- debt_payments(u) = SUM(min + extra where owner=u)
- invest(u) = SUM(monthly_contribution of investment_accounts owned by u) + share(u) x SUM(of joint investment accounts)
- **leftover(u) = income - personal_bills - share_of_joint - pledges - debt_payments - invest**
- spent_mtd(u) = SUM(txns this month: paid_by_user=u, is_shared=false, type=variable)
- left_of_leftover(u) = leftover - spent_mtd

**5.7 Household budget (dashboard)**
- income = income(1) + income(2); fixed = joint + both personal bills; variable = SUM(variable_budgets); contributions = SUM(all pledges); debt = SUM(all debt payments); investing = SUM(all investment monthly contributions)
- **household_leftover = income - fixed - variable - contributions - debt - investing**; bonus_on_top = SUM(lisa_bonus)

**5.8 Actuals (current month)**
- spent = SUM(fixed+variable txns); transfers = SUM(transfer txns); budget_total = derived_fixed_budgets + variable budgets; left_in_budgets = budget_total - spent; overdue_count

**5.9 Monthly matrix (12 months from a chosen start month)**
- fixed budget per category = SUM(bills in that category, joint + personal); "Debt repayment" category budget = SUM(debt payments)
- variable budget per category = variable_budgets row
- actual(cat, month) = SUM(txn amounts in that category and month); cell flagged red when actual > budget and actual > 0

**5.10 Debts.** payment = min + extra; monthly_rate = apr/12.
- months_to_clear = payment <= balance x monthly_rate -> "Payment too small"; rate = 0 -> ceil(balance/payment); else ceil( -ln(1 - balance x rate / payment) / ln(1 + rate) )
- payoff_date = today + months; avalanche rank = by apr desc; snowball rank = by balance asc

**5.11 Forecast (25 rows: now + 24 months).** Per goal: b0 = saved; b(n+1) = b(n) x (1 + aer/12) + pledge_total + lisa_bonus. house_pot(n) = SUM over lisa goals. Totals per row. Investments project the same way per account (see 5.15) and the endpoint returns goals, investments, and a combined total series.

**5.12 Affordability.** mortgage = multiple x 12 x (income1 + income2); max_price_24m = house_pot(24) + mortgage. Always display: "Rule of thumb, not advice. LISA-bought homes capped at £450,000."

**5.13 Emergency cover** = emergency goal saved / (total_joint_bills + both personal_bills), 1 dp, guide "aim for 3-6 months".

**5.14 Net worth** = SUM(accounts.balance) + latest pots total + latest investments total - SUM(debts.balance).

**5.15 Investments (per account)**
- value = latest investment_snapshot (0 if none)
- contributed = contributed_before + SUM(transfer transactions linked to the account)
- gain = value - contributed; gain_pct = contributed > 0 ? gain / contributed : n/a
- monthly_contribution is a planning input, like a pledge; waterfall attribution is the owner's, joint accounts split by effective share
- projection: v0 = value; v(n+1) = v(n) x (1 + expected_growth/12) + monthly_contribution, for 24 months
- Static note shown on the page: "ISAs: £20,000/year allowance per person across cash ISAs, S&S ISAs and LISAs (LISA money counts toward it)."

Rounding: compute in pence, display planning figures as whole £ and actuals as £0.00, en-GB.

## 6. API (REST, JSON, all under /api, session-authed)

CRUD (GET list / POST / PATCH / DELETE) for: `transactions` (paginated, filter by month/category/paid_by), `bills`, `goals` (pledges nested), `pot-snapshots`, `accounts`, `debts`, `investment-accounts`, `investment-snapshots`, `income-sources`, `categories`, `variable-budgets`, `settlements`, `net-worth-snapshots`. Singleton: `GET/PATCH /settings`.

Computed (read-only):
- `GET /dashboard` -> everything section 5.7, 5.8, 5.3, 5.13, 5.14, a 5.15 summary (total value, gain), goals-at-a-glance, affordability, overdue bills
- `GET /investments` -> per-account value, contributed, gain, projection; totals
- `GET /my-money/:userId` -> section 5.6 + contribution and projection tables
- `GET /budgets?start=YYYY-MM` -> the 12-month matrix
- `GET /forecast` -> 25 rows per goal + totals
- `GET /settle-up` -> net, direction, history of settlements

Mutations return the affected computed blocks so the UI updates without refetching everything. Validation errors: 422 with per-field messages.

### 6.1 Backend architecture: controllers, services, repositories
Layered, dependencies point strictly downward. In Next.js the "controller" is the route handler; the layer stays because the discipline is the point, even though the framework does not force it.

```
app/api/**/route.ts         controllers (thin)
src/server/services/        business logic, owns DB transactions
src/server/repositories/    all Drizzle queries, one per aggregate
src/server/calc/            section 5, pure functions, no I/O
src/server/db/              drizzle client, schema, migrations
src/server/auth/            better-auth config
```

- **Controllers**: authenticate, parse and validate with the shared Zod schema, call exactly one service method, map the result or typed error to HTTP. No business logic, no Drizzle imports, under ~30 lines each.
- **Services**: orchestrate repositories and the calc engine, enforce invariants (snapshot upsert per month, a transaction links to at most one of bill / goal / investment), own `db.transaction`, and return domain results or typed errors (NotFound, Conflict, DomainRule). One service per area: transactions, goals, bills, investments, settle-up, dashboard.
- **Repositories**: the only layer that imports Drizzle. One per aggregate, methods named by intent (`latestSnapshotPerGoal()`, not query fragments). Each method accepts an optional transaction handle so services can compose them atomically. Return domain types (pence integers), never raw rows.
- **Calc engine**: pure and deterministic, clock injected, imports nothing from other layers. This is the module the section 12 golden tests hit.
- **Wiring**: factory functions and plain constructor arguments. No DI container, no decorators, no NestJS-style modules; the pattern is folders and discipline, not framework.
- **Testing by layer**: calc and services unit-tested with in-memory repository fakes; repositories integration-tested against a real Postgres (a Neon branch); controllers exercised by the Playwright flows.

## 7. Frontend

### 7.1 Stack (decided)
- App: Next.js (App Router, current stable) + TypeScript, single repo, pnpm
- Data: Postgres on Neon (scale-to-zero suits an often-idle 2-user app and resumes automatically; branching gives a dev DB with the real seed) + Drizzle ORM and drizzle-kit migrations
- Contracts: Zod schemas shared by forms, controllers and the calc engine
- Auth: Better Auth (email + password first-class with rate limiting and password policy built in; the Auth.js team now maintains it and recommends it for new projects)
- UI: Tailwind + shadcn/ui + lucide icons themed with the 7.2 tokens; react-hook-form + Zod resolver; server components for reads, TanStack Query for mutations with optimistic updates; Recharts for charts
- Quality: Vitest (calc engine golden tests), Playwright (quick-add, settle-up, month-end), Biome for lint and format, GitHub Actions on PR (typecheck, unit, e2e smoke)
- Delivery: Vercel hobby + Neon free tier; secrets in Vercel env vars; nightly pg_dump via GitHub Actions cron to private storage; seed script reads the v2 xlsx with SheetJS
- Deliberately not used: tRPC/GraphQL, a second service, Docker/K8s, Redis, queues, monorepo tooling, Storybook, third-party analytics

### 7.2 Design system
**Direction.** This is a couple's household ledger, not a fintech SaaS. The identity comes from the workbook the app replaces: navy and workbook blue, a calm paper background, statuses that speak plainly. Quiet, warm, precise. No gradients, no dashboard-template look.

**Tokens** (CSS variables in the shadcn convention; a dark theme later is a token swap, not a redesign):
| Token | Value | Use |
|---|---|---|
| ledger-navy | #1F3864 | brand, headings, nav, dark chart series |
| workbook-blue | #4472C4 | primary actions, links, focus ring, chart primary |
| paper | #F6F8FB | app background |
| surface / border | #FFFFFF / #E2E8F2 | cards, hairlines |
| ink / ink-muted | #1B2A44 / #5A6B85 | text |
| mint / fern | #E2EFDA / #1E6F43 | positive: Paid, On track, gains |
| blush / brick | #FBEAEA / #B3261E | negative: OVERDUE, Behind, losses |
| butter / amber | #FFF4CE / #9A6700 | Due, warnings |
| ade-teal / p-plum | #2E8FA3 / #8A4FBE | person accents: avatars, chips, chart series |

**Type.** Two faces. Fraunces (600) for page titles and the signature sentences only; Inter for everything else, with tabular numerals on every money figure. Scale: 13/14 body, 16 section titles, 28-32 KPI figures. Money is always Inter semibold, never the display face except inside a signature sentence.

**Signature: the ledger speaks in sentences.** The app's computed verdicts render as full typeset sentences in Fraunces with the number inline: "P owes Ade £27.50." / "£2,155 left this month." / "0.7 months of cover. Aim for 3 to 6." At most one per screen; everything around it stays quiet. This is the one memorable element, and nothing else gets decorative treatment.

**Surfaces.** Cards: 10px radius, 1px border, no shadows except the quick-add sheet and dialogs. Tables on desktop, cards on mobile. Row hover #EFF3F9. 4px spacing grid, 20-24px card padding.

**Motion.** One orchestrated moment: dashboard figures settle with a single 300ms count-up on load. Everything else is a 150ms ease-out fade. `prefers-reduced-motion` disables both.

**Copy rules.** Active voice, sentence case, action names constant through a flow ("Log spending" button, "Logged" toast). Errors state what happened and what to do next, without apology. Empty states are invitations with one primary action ("No investments yet. Add an account to include it in net worth."). Statuses reuse the workbook's exact vocabulary: Paid, Due, OVERDUE, On track (+£58), Behind by £58.

**Quality floor.** Responsive to 360px, visible keyboard focus everywhere, WCAG AA contrast for every token pairing above, en-GB currency and dates throughout.

### 7.3 Navigation
- Mobile (primary): bottom tab bar - Dashboard, Transactions, big central **+** (quick-add), Goals, More (Budgets, Pots, Investments, Forecast, Debts, Net Worth, Settings, Help). Sticky month header where relevant.
- Desktop: left sidebar with the same items ungrouped; content max-width 1100px.

### 7.4 Pages

**Dashboard** (mirrors Unified Dashboard, read-only)
- Row of KPI cards: Household leftover, Settle-up ("Ade owes P £27.50" + "Settle up" button), Left in the budgets, Net worth
- "This month, as budgeted": income, fixed, variable, contributions, investment contributions, debt payments, leftover, LISA bonus on top
- "Ade vs P" two-column mini table: income, personal bills, share of joint, contributions, debt, leftover
- "This month, actual": spent, budget, transfers to pots, overdue bills count (red badge, links to Bills)
- Goals at a glance: table with progress bars and status chips
- Investments card: total value with gain/loss in £ and % (green/red), links to Investments
- Emergency fund gauge (x.x months, 3-6 target band)
- Forecast and house affordability card: pots at 12/24 months, house pot, mortgage estimate, indicative max price, the £450k caveat in small print

**Transactions**
- Month picker, running list newest-first grouped by day; each row: description, category chip, amount, paid-by avatar, shared badge
- Quick-add (also the global +): Amount -> Description -> Category -> Paid by (Ade/P/Joint) -> Shared toggle (default on for Joint) -> optional: link bill (auto-suggested), link goal or investment, share override, date (defaults today), notes. Two taps and a number for the common case; saves optimistically.
- Edit/delete inline. Refunds: negative amounts allowed, labelled.
- Footer totals for the month: spent, transfers.

**Bills**
- Joint bills table and two personal sections: name, category, £/mo, due day, status chip, "log payment" shortcut that pre-fills quick-add with the bill linked
- Total joint bills; overdue items float to the top

**Goals**
- Card per goal: progress bar (saved/target), target date, pledges per person (editable inline), Total £/mo, LISA bonus, Required £/mo, status chip, LISA allowance warning when breached
- Totals row; add/archive goal; mark one goal as emergency fund

**My Money** (one per user, switchable)
- Income sources (editable), personal bills (editable), share of joint costs (computed, shows the split method), contributions (read-only, links to Goals), investment contributions (read-only, links to Investments), debt payments, then the leftover waterfall ending in the two KPIs: Leftover and Left of my leftover
- "What your money alone adds up to": 6/12/24-month table

**Budgets** (Monthly Spending)
- Start-month picker; two grids (Fixed, Variable), rows = categories, columns = 12 months, sticky first column; budget column derived (fixed) or editable (variable); over-budget cells red; totals rows; on mobile collapses to per-month category list

**Pots** (Balances)
- Month-end entry form: one input per goal, "save snapshot" writes the month row; history table below; LATEST strip on top matches the sheet
- Reminder banner on the dashboard in the last 3 days of the month if this month's snapshot is missing

**Investments**
- Card per account: name, provider, wrapper chip (S&S ISA / Pension / GIA / Crypto), owner avatar, latest value, contributed, gain/loss in £ and % (green/red), monthly contribution and expected growth (editable inline)
- Totals strip: value, contributed, gain; 24-month projection line chart
- Month-end snapshot form, same pattern as Pots; history table below; covered by the same end-of-month reminder banner
- "Log contribution" shortcut prefills quick-add as an Investment contribution transfer linked to the account
- Small print: the £20,000 ISA allowance note; empty state: "No investments yet - add an account to include it in net worth"

**Forecast**
- Line chart of total and per-goal balances over 24 months + the table; house-pot line highlighted; separate investments series and a combined pots + investments total

**Debts**
- Table as per the sheet incl avalanche/snowball ranks; empty state: "No debts - everything reads £0"

**Net Worth**
- Everyday accounts (editable balances), pots (from latest snapshot), investments (latest total), debts, HOUSEHOLD NET WORTH KPI; "save snapshot" appends to history; small history line chart

**Settings**
- Names, split method (radio) + custom share slider, LISA assumptions, mortgage multiple, category manager (add/rename/retype/archive; deleting blocked when in use), data export (CSV per table), invite partner

**Onboarding / Help**
- First run: create household -> add both names/incomes -> import (section 11) or start blank -> tour of the 10-minute routine. Help panel reproduces the Read Me.

### 7.5 States
- Empty states with one-line explanations and a primary action
- Optimistic updates with undo toast on delete; conflict-free (last write wins is fine for 2 users)
- Loading: skeleton cards, never spinners over full pages

### 7.6 Component architecture
- Three tiers: shadcn primitives (Button, Input, Select, Dialog, Sheet, Tabs, Table, Badge, Progress, Toast, Skeleton) -> domain components -> page compositions. Pages compose, they do not style; every colour and size comes from the 7.2 tokens.
- Domain components, the reused vocabulary of the app: MoneyText (pence in, en-GB out, tabular numerals), MoneyInput (pence-safe, no floats), StatusChip, PersonBadge (Ade / P / Joint), KpiCard, LedgerSentence (the 7.2 signature), SectionCard, MonthSwitcher, QuickAddSheet, TransactionRow, GoalCard, BillRow, SnapshotForm (shared by Pots and Investments), MatrixTable (sticky first column), TrendChart, ProgressBar, EmptyState, ConfirmDialog, SettleUpDialog.
- Server components render every read; client components are leaves that need interactivity (forms, dialogs, month switcher, charts). No data fetching in client components other than TanStack Query mutations.
- Components accept domain types from section 5, never DB rows. All money passes through MoneyText / MoneyInput; a raw number rendered anywhere is a review failure.
- Every list-bearing component ships its loading (skeleton), empty and error states as part of its definition, not as page afterthoughts.

## 8. Key flows
1. **Log a transaction** (target < 10s): + -> amount -> description -> category -> save. Defaults: today, paid by = current user, shared = No unless Joint.
2. **Month end** (target < 5 min): banner -> Pots snapshot form -> Investments snapshot form -> account balances on Net Worth -> dashboard review together.
3. **Settle up**: dashboard card -> "Settle up" -> confirm amount (pre-filled with net) and payer -> records settlement, card returns to "All square".
4. **Pay a bill**: Bills -> "log payment" -> quick-add pre-filled and linked -> status flips to Paid.
5. **Log an investment contribution**: Investments -> "log contribution" -> quick-add pre-filled as an Investment contribution transfer linked to the account -> contributed and gain update.

## 9. Validation and business rules
- amount != 0; date required; category required; share_override in 0..1; due_day 1..31; pledges >= 0; APR 0..1
- paid_by=user requires paid_by_user_id; is_shared has no meaning on transfers (ignored)
- One pot snapshot per goal per month (upsert); categories unique by name; archiving hides from pickers but keeps history
- One investment snapshot per account per month (upsert); expected_growth in -0.50..0.50; contributed_before >= 0; a transaction links to at most one of bill / goal / investment
- Timezone Europe/London for "today", "this month", due dates

## 10. Non-functional
- HTTPS only; secrets in env; no third-party analytics or trackers; household data never leaves the DB except user-initiated CSV export
- Nightly pg_dump via GitHub Actions cron to private storage, 30-day retention (Neon free-tier history is short); restore runbook documented
- p95 < 300ms for computed endpoints at this data volume (trivial); dashboard renders in one round trip
- Unit tests on every 5.x function; integration tests on computed endpoints; the golden tests in 12 run in CI

## 11. Data migration (seed from the spreadsheet)
One-off script parses `Ade_P_Finance_Tracker_v2.xlsx` and inserts: settings, 20 categories (the sheet's 19 plus "Investment contribution", type transfer), 7 joint bills + 6 personal bills, 6 goals + pledges, Aug 2026 pot snapshot, 9 transactions (mapping Shared?/Paid by/linked goal), income sources, variable budgets. Everyday accounts, debts, investments and history start empty, as in the file.

## 12. Acceptance criteria - golden tests
With the seed data and a fixed clock of 28 Aug 2026, the app MUST return exactly:

| Value | Expected |
|---|---|
| Effective shares | 50% / 50% |
| Household: income / fixed / variable / contributions | £6,000 / £1,755 / £1,020 / £1,070 |
| Household leftover / LISA bonus on top | £2,155 / £125 |
| Ade: leftover / left of leftover | £1,468 / £1,438 |
| P: leftover / left of leftover | £687 / £687 |
| Settle-up | Ade owes P £27.50 |
| Actual: spent / transfers | £1,644.50 / £250 |
| Bills | Rent Paid, Energy Paid, 5 Overdue |
| Ade's LISA: required / status | £370.59 / Behind by £58 |
| Pots latest total | £7,550 |
| Forecast totals now / +12m / +24m | £7,550 / £21,890 / £36,230 |
| House pot +12m / +24m | £11,700 / £19,200 |
| Mortgage / indicative max price +24m | £324,000 / £343,200 |
| Emergency cover | 0.7 months |
| Net worth (accounts empty) | £7,550 |

Behavioural: adding a transaction updates dashboard actuals and settle-up without reload; switching split method to Proportional changes shares to 56.7%/43.3% everywhere; recording a settlement of £27.50 shows "All square"; a LISA pledge of £400/mo shows the allowance warning.

Investments (worked example, not in the seed): create an S&S ISA with contributed-before £5,000 and a snapshot of £5,600 -> value £5,600, gain +£600 (+12.0%), and net worth rises by £5,600. With expected growth 6% and a £200/mo contribution, projection month 1 = £5,828.00. Logging a £200 contribution linked to the account moves contributed to £5,200 and gain to +£400 (+7.7%). The seed golden table above is unchanged because investments start empty.

## 13. Future (explicitly out of v1)
Open banking import, push/email reminders (bill due, snapshot missing), ISA and LISA contributions tracked against the actual 6 April tax year (£20,000 and £4,000 allowances), per-holding investment tracking with live prices, pension projections, receipt photos, dark mode, PWA install prompt.
