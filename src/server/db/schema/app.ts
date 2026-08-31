/**
 * Section 4 data model. Money is bigint pence (read as JS numbers), every row
 * carries household_id and timestamps, ids are uuids. Column names are
 * snake_case via the drizzle `casing` option.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUser } from "./auth";

export const splitMethodEnum = pgEnum("split_method", ["fifty_fifty", "proportional", "custom"]);
export const categoryTypeEnum = pgEnum("category_type", ["fixed", "variable", "transfer"]);
export const ownerKindEnum = pgEnum("owner_kind", ["joint", "user"]);
export const goalTypeEnum = pgEnum("goal_type", ["lisa", "standard"]);
export const investmentWrapperEnum = pgEnum("investment_wrapper", ["ss_isa", "pension", "gia", "crypto", "other"]);

const id = () => uuid().primaryKey().defaultRandom();
const pence = () => bigint({ mode: "number" });
const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const households = pgTable("households", {
  id: id(),
  name: text().notNull(),
  ...timestamps,
});

const householdId = () =>
  uuid()
    .notNull()
    .references(() => households.id, { onDelete: "cascade" });

/**
 * The two people in the ledger. A member exists from onboarding (so "P" has
 * pledges and bills before P signs up); the auth account is linked when the
 * invite is accepted. Domain `User.id` is the member id.
 */
export const householdMembers = pgTable(
  "household_members",
  {
    id: id(),
    householdId: householdId(),
    /** 1 = user1 (Ade), 2 = user2 */
    position: integer().notNull(),
    name: text().notNull(),
    authUserId: text().references(() => authUser.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("household_members_household_position_idx").on(t.householdId, t.position),
    uniqueIndex("household_members_auth_user_idx").on(t.authUserId),
    check("household_members_position_check", sql`${t.position} in (1, 2)`),
  ],
);

const memberRef = () => uuid().references(() => householdMembers.id, { onDelete: "restrict" });

export const invites = pgTable(
  "invites",
  {
    id: id(),
    householdId: householdId(),
    /** which member slot the invitee will take (always 2 in practice) */
    position: integer().notNull(),
    tokenHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdByMemberId: memberRef(),
    ...timestamps,
  },
  (t) => [uniqueIndex("invites_token_hash_idx").on(t.tokenHash)],
);

export const settings = pgTable(
  "settings",
  {
    id: id(),
    householdId: householdId(),
    splitMethod: splitMethodEnum().notNull().default("fifty_fifty"),
    customShareUser1: numeric({ precision: 5, scale: 4, mode: "number" }).notNull().default(0.5),
    lisaBonusRate: numeric({ precision: 5, scale: 4, mode: "number" }).notNull().default(0.25),
    lisaAnnualAllowancePence: pence().notNull().default(400_000),
    mortgageMultiple: numeric({ precision: 4, scale: 2, mode: "number" }).notNull().default(4.5),
    ...timestamps,
  },
  (t) => [uniqueIndex("settings_household_idx").on(t.householdId)],
);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    householdId: householdId(),
    name: text().notNull(),
    type: categoryTypeEnum().notNull(),
    sort: integer().notNull().default(0),
    archived: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("categories_household_name_idx").on(t.householdId, sql`lower(${t.name})`)],
);

export const incomeSources = pgTable(
  "income_sources",
  {
    id: id(),
    householdId: householdId(),
    memberId: memberRef().notNull(),
    name: text().notNull(),
    monthlyPence: pence().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("income_sources_member_idx").on(t.memberId)],
);

export const bills = pgTable(
  "bills",
  {
    id: id(),
    householdId: householdId(),
    name: text().notNull(),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    monthlyPence: pence().notNull().default(0),
    /** null = due date not tracked (personal bills in the workbook) */
    dueDay: integer(),
    owner: ownerKindEnum().notNull(),
    ownerMemberId: memberRef(),
    /** manual ordering on the Bills page (drag to reorder) */
    sort: integer().notNull().default(0),
    notes: text(),
    archived: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("bills_household_idx").on(t.householdId),
    check("bills_due_day_check", sql`${t.dueDay} is null or (${t.dueDay} between 1 and 31)`),
    check(
      "bills_owner_check",
      sql`(${t.owner} = 'joint' and ${t.ownerMemberId} is null) or (${t.owner} = 'user' and ${t.ownerMemberId} is not null)`,
    ),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: id(),
    householdId: householdId(),
    name: text().notNull(),
    type: goalTypeEnum().notNull().default("standard"),
    targetPence: pence().notNull(),
    targetDate: date({ mode: "string" }).notNull(),
    aer: numeric({ precision: 6, scale: 4, mode: "number" }).notNull().default(0),
    isEmergencyFund: boolean().notNull().default(false),
    notes: text(),
    sort: integer().notNull().default(0),
    archived: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [index("goals_household_idx").on(t.householdId)],
);

export const goalPledges = pgTable(
  "goal_pledges",
  {
    id: id(),
    householdId: householdId(),
    goalId: uuid()
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    memberId: memberRef().notNull(),
    monthlyPence: pence().notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("goal_pledges_goal_member_idx").on(t.goalId, t.memberId)],
);

export const investmentAccounts = pgTable(
  "investment_accounts",
  {
    id: id(),
    householdId: householdId(),
    name: text().notNull(),
    provider: text().notNull().default(""),
    wrapper: investmentWrapperEnum().notNull().default("other"),
    owner: ownerKindEnum().notNull(),
    ownerMemberId: memberRef(),
    monthlyContributionPence: pence().notNull().default(0),
    /** annual, -0.5..0.5 */
    expectedGrowth: numeric({ precision: 6, scale: 4, mode: "number" }).notNull().default(0),
    contributedBeforePence: pence().notNull().default(0),
    notes: text(),
    archived: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("investment_accounts_household_idx").on(t.householdId),
    check("investment_accounts_growth_check", sql`${t.expectedGrowth} between -0.5 and 0.5`),
    check("investment_accounts_contributed_check", sql`${t.contributedBeforePence} >= 0`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    householdId: householdId(),
    date: date({ mode: "string" }).notNull(),
    description: text().notNull(),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    /** negative = refund */
    amountPence: pence().notNull(),
    paidBy: ownerKindEnum().notNull(),
    paidByMemberId: memberRef(),
    isShared: boolean().notNull().default(false),
    /** user1's share of THIS transaction, 0..1 */
    shareOverride: numeric({ precision: 5, scale: 4, mode: "number" }),
    linkedBillId: uuid().references(() => bills.id, { onDelete: "set null" }),
    linkedGoalId: uuid().references(() => goals.id, { onDelete: "set null" }),
    linkedInvestmentId: uuid().references(() => investmentAccounts.id, { onDelete: "set null" }),
    notes: text(),
    ...timestamps,
  },
  (t) => [
    index("transactions_household_date_idx").on(t.householdId, t.date),
    index("transactions_category_idx").on(t.categoryId),
    check("transactions_amount_check", sql`${t.amountPence} <> 0`),
    check("transactions_share_override_check", sql`${t.shareOverride} is null or (${t.shareOverride} between 0 and 1)`),
    check(
      "transactions_one_link_check",
      sql`(${t.linkedBillId} is not null)::int + (${t.linkedGoalId} is not null)::int + (${t.linkedInvestmentId} is not null)::int <= 1`,
    ),
    check(
      "transactions_paid_by_check",
      sql`(${t.paidBy} = 'joint' and ${t.paidByMemberId} is null) or (${t.paidBy} = 'user' and ${t.paidByMemberId} is not null)`,
    ),
  ],
);

export const settlements = pgTable(
  "settlements",
  {
    id: id(),
    householdId: householdId(),
    date: date({ mode: "string" }).notNull(),
    fromMemberId: memberRef().notNull(),
    toMemberId: memberRef().notNull(),
    amountPence: pence().notNull(),
    notes: text(),
    ...timestamps,
  },
  (t) => [
    index("settlements_household_idx").on(t.householdId),
    check("settlements_amount_check", sql`${t.amountPence} > 0`),
    check("settlements_parties_check", sql`${t.fromMemberId} <> ${t.toMemberId}`),
  ],
);

export const potSnapshots = pgTable(
  "pot_snapshots",
  {
    id: id(),
    householdId: householdId(),
    goalId: uuid()
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    /** first of month */
    month: date({ mode: "string" }).notNull(),
    balancePence: pence().notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pot_snapshots_goal_month_idx").on(t.goalId, t.month),
    index("pot_snapshots_goal_month_desc_idx").on(t.goalId, t.month.desc()),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    householdId: householdId(),
    name: text().notNull(),
    owner: ownerKindEnum().notNull(),
    ownerMemberId: memberRef(),
    balancePence: pence().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("accounts_household_idx").on(t.householdId)],
);

export const netWorthSnapshots = pgTable(
  "net_worth_snapshots",
  {
    id: id(),
    householdId: householdId(),
    month: date({ mode: "string" }).notNull(),
    valuePence: pence().notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("net_worth_snapshots_household_month_idx").on(t.householdId, t.month)],
);

export const debts = pgTable(
  "debts",
  {
    id: id(),
    householdId: householdId(),
    ownerMemberId: memberRef().notNull(),
    lender: text().notNull(),
    balancePence: pence().notNull().default(0),
    apr: numeric({ precision: 6, scale: 4, mode: "number" }).notNull().default(0),
    minPaymentPence: pence().notNull().default(0),
    extraPaymentPence: pence().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("debts_household_idx").on(t.householdId), check("debts_apr_check", sql`${t.apr} between 0 and 1`)],
);

export const investmentSnapshots = pgTable(
  "investment_snapshots",
  {
    id: id(),
    householdId: householdId(),
    accountId: uuid()
      .notNull()
      .references(() => investmentAccounts.id, { onDelete: "cascade" }),
    month: date({ mode: "string" }).notNull(),
    valuePence: pence().notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("investment_snapshots_account_month_idx").on(t.accountId, t.month)],
);

export const variableBudgets = pgTable(
  "variable_budgets",
  {
    id: id(),
    householdId: householdId(),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    monthlyPence: pence().notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("variable_budgets_category_idx").on(t.categoryId)],
);
