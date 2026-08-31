/** Row <-> domain conversions. Repositories return domain types, never raw rows (section 6.1). */
import type {
  Account,
  Bill,
  Category,
  Debt,
  Goal,
  IncomeSource,
  InvestmentAccount,
  InvestmentSnapshot,
  NetWorthSnapshot,
  Owner,
  PotSnapshot,
  Settlement,
  Transaction,
} from "@/domain/types";
import type * as s from "@/server/db/schema";

export type OwnerKind = "joint" | "user";

export function toOwner(kind: OwnerKind, memberId: string | null): Owner {
  return kind === "joint" || memberId === null ? { kind: "joint" } : { kind: "user", userId: memberId };
}

export function fromOwner(owner: Owner): { kind: OwnerKind; memberId: string | null } {
  return owner.kind === "joint" ? { kind: "joint", memberId: null } : { kind: "user", memberId: owner.userId };
}

/** Postgres DATE comes back as "YYYY-MM-DD" with mode: "string"; normalise defensively. */
export function toISODate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];

export const rowToCategory = (c: Row<typeof s.categories>): Category => ({
  id: c.id,
  name: c.name,
  type: c.type,
  sort: c.sort,
  archived: c.archived,
});

export const rowToIncomeSource = (i: Row<typeof s.incomeSources>): IncomeSource => ({
  id: i.id,
  userId: i.memberId,
  name: i.name,
  monthlyPence: i.monthlyPence,
});

export const rowToBill = (b: Row<typeof s.bills>): Bill => ({
  id: b.id,
  name: b.name,
  categoryId: b.categoryId,
  monthlyPence: b.monthlyPence,
  dueDay: b.dueDay,
  owner: toOwner(b.owner, b.ownerMemberId),
  sort: b.sort,
  notes: b.notes,
  archived: b.archived,
});

export const billToRow = (householdId: string, b: Omit<Bill, "id">) => {
  const o = fromOwner(b.owner);
  return {
    householdId,
    name: b.name,
    categoryId: b.categoryId,
    monthlyPence: b.monthlyPence,
    dueDay: b.dueDay,
    owner: o.kind,
    ownerMemberId: o.memberId,
    sort: b.sort,
    notes: b.notes,
    archived: b.archived,
  };
};

export const rowToGoal = (g: Row<typeof s.goals>, pledges: Goal["pledges"]): Goal => ({
  id: g.id,
  name: g.name,
  type: g.type,
  targetPence: g.targetPence,
  targetDate: toISODate(g.targetDate),
  aer: g.aer,
  isEmergencyFund: g.isEmergencyFund,
  notes: g.notes,
  sort: g.sort,
  archived: g.archived,
  pledges,
});

export const goalToRow = (householdId: string, g: Omit<Goal, "id" | "pledges">) => ({
  householdId,
  name: g.name,
  type: g.type,
  targetPence: g.targetPence,
  targetDate: g.targetDate,
  aer: g.aer,
  isEmergencyFund: g.isEmergencyFund,
  notes: g.notes,
  sort: g.sort,
  archived: g.archived,
});

export const rowToTransaction = (t: Row<typeof s.transactions>): Transaction => ({
  id: t.id,
  date: toISODate(t.date),
  description: t.description,
  categoryId: t.categoryId,
  amountPence: t.amountPence,
  paidBy: toOwner(t.paidBy, t.paidByMemberId),
  isShared: t.isShared,
  shareOverride: t.shareOverride,
  linkedBillId: t.linkedBillId,
  linkedGoalId: t.linkedGoalId,
  linkedInvestmentId: t.linkedInvestmentId,
  notes: t.notes,
});

export const transactionToRow = (householdId: string, t: Omit<Transaction, "id">) => {
  const p = fromOwner(t.paidBy);
  return {
    householdId,
    date: t.date,
    description: t.description,
    categoryId: t.categoryId,
    amountPence: t.amountPence,
    paidBy: p.kind,
    paidByMemberId: p.memberId,
    isShared: t.isShared,
    shareOverride: t.shareOverride,
    linkedBillId: t.linkedBillId,
    linkedGoalId: t.linkedGoalId,
    linkedInvestmentId: t.linkedInvestmentId,
    notes: t.notes,
  };
};

export const rowToSettlement = (x: Row<typeof s.settlements>): Settlement => ({
  id: x.id,
  date: toISODate(x.date),
  fromUserId: x.fromMemberId,
  toUserId: x.toMemberId,
  amountPence: x.amountPence,
  notes: x.notes,
});

export const rowToPotSnapshot = (p: Row<typeof s.potSnapshots>): PotSnapshot => ({
  id: p.id,
  goalId: p.goalId,
  month: toISODate(p.month),
  balancePence: p.balancePence,
});

export const rowToInvestmentSnapshot = (v: Row<typeof s.investmentSnapshots>): InvestmentSnapshot => ({
  id: v.id,
  accountId: v.accountId,
  month: toISODate(v.month),
  valuePence: v.valuePence,
});

export const rowToNetWorthSnapshot = (n: Row<typeof s.netWorthSnapshots>): NetWorthSnapshot => ({
  id: n.id,
  month: toISODate(n.month),
  valuePence: n.valuePence,
});

export const rowToAccount = (a: Row<typeof s.accounts>): Account => ({
  id: a.id,
  name: a.name,
  owner: toOwner(a.owner, a.ownerMemberId),
  balancePence: a.balancePence,
});

export const accountToRow = (householdId: string, a: Omit<Account, "id">) => {
  const o = fromOwner(a.owner);
  return { householdId, name: a.name, owner: o.kind, ownerMemberId: o.memberId, balancePence: a.balancePence };
};

export const rowToDebt = (d: Row<typeof s.debts>): Debt => ({
  id: d.id,
  ownerUserId: d.ownerMemberId,
  lender: d.lender,
  balancePence: d.balancePence,
  apr: d.apr,
  minPaymentPence: d.minPaymentPence,
  extraPaymentPence: d.extraPaymentPence,
});

export const debtToRow = (householdId: string, d: Omit<Debt, "id">) => ({
  householdId,
  ownerMemberId: d.ownerUserId,
  lender: d.lender,
  balancePence: d.balancePence,
  apr: d.apr,
  minPaymentPence: d.minPaymentPence,
  extraPaymentPence: d.extraPaymentPence,
});

export const rowToInvestmentAccount = (a: Row<typeof s.investmentAccounts>): InvestmentAccount => ({
  id: a.id,
  name: a.name,
  provider: a.provider,
  wrapper: a.wrapper,
  owner: toOwner(a.owner, a.ownerMemberId),
  monthlyContributionPence: a.monthlyContributionPence,
  expectedGrowth: a.expectedGrowth,
  contributedBeforePence: a.contributedBeforePence,
  notes: a.notes,
  archived: a.archived,
});

export const investmentAccountToRow = (householdId: string, a: Omit<InvestmentAccount, "id">) => {
  const o = fromOwner(a.owner);
  return {
    householdId,
    name: a.name,
    provider: a.provider,
    wrapper: a.wrapper,
    owner: o.kind,
    ownerMemberId: o.memberId,
    monthlyContributionPence: a.monthlyContributionPence,
    expectedGrowth: a.expectedGrowth,
    contributedBeforePence: a.contributedBeforePence,
    notes: a.notes,
    archived: a.archived,
  };
};
