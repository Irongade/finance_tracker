"use client";

/**
 * In-memory household store for the UI mock-up. Holds the seed data, applies
 * mutations with a reducer and recomputes every section-5 view with the
 * shared calc engine. When the backend lands, pages read the same view types
 * from server components and this file goes away.
 */

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useReducer, useState } from "react";
import type {
  Account,
  Bill,
  Category,
  Clock,
  Debt,
  Goal,
  Household,
  HouseholdView,
  IncomeSource,
  InvestmentAccount,
  ISOMonth,
  Matrix,
  Settings,
  Settlement,
  Transaction,
  User,
} from "@/domain/types";
import { computeBudgetMatrix, computeHouseholdView } from "@/server/calc";
import { ADE, cloneSeed, SEED_TODAY } from "./fixtures";

export type Action =
  | { type: "reset" }
  | { type: "addTransaction"; txn: Transaction }
  | { type: "updateTransaction"; txn: Transaction }
  | { type: "deleteTransaction"; id: string }
  | { type: "addSettlement"; settlement: Settlement }
  | { type: "savePotSnapshots"; month: ISOMonth; balances: Record<string, number> }
  | { type: "saveInvestmentSnapshots"; month: ISOMonth; values: Record<string, number> }
  | { type: "updateAccount"; account: Account }
  | { type: "addAccount"; account: Account }
  | { type: "deleteAccount"; id: string }
  | { type: "saveNetWorthSnapshot"; month: ISOMonth; valuePence: number }
  | { type: "updateSettings"; patch: Partial<Settings> }
  | { type: "updateUserName"; userId: string; name: string }
  | { type: "updatePledge"; goalId: string; userId: string; monthlyPence: number }
  | { type: "addGoal"; goal: Goal }
  | { type: "updateGoal"; goal: Goal }
  | { type: "archiveGoal"; id: string }
  | { type: "setEmergencyFund"; id: string }
  | { type: "updateVariableBudget"; categoryId: string; monthlyPence: number }
  | { type: "addBill"; bill: Bill }
  | { type: "updateBill"; bill: Bill }
  | { type: "archiveBill"; id: string }
  | { type: "upsertIncomeSource"; source: IncomeSource }
  | { type: "deleteIncomeSource"; id: string }
  | { type: "addDebt"; debt: Debt }
  | { type: "updateDebt"; debt: Debt }
  | { type: "deleteDebt"; id: string }
  | { type: "addInvestmentAccount"; account: InvestmentAccount }
  | { type: "updateInvestmentAccount"; account: InvestmentAccount }
  | { type: "archiveInvestmentAccount"; id: string }
  | { type: "addCategory"; category: Category }
  | { type: "updateCategory"; category: Category }
  | { type: "archiveCategory"; id: string };

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

function replaceById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.map((x) => (x.id === item.id ? item : x));
}

function reducer(h: Household, a: Action): Household {
  switch (a.type) {
    case "reset":
      return cloneSeed();
    case "addTransaction":
      return { ...h, transactions: [...h.transactions, a.txn] };
    case "updateTransaction":
      return { ...h, transactions: replaceById(h.transactions, a.txn) };
    case "deleteTransaction":
      return { ...h, transactions: h.transactions.filter((t) => t.id !== a.id) };
    case "addSettlement":
      return { ...h, settlements: [...h.settlements, a.settlement] };
    case "savePotSnapshots": {
      const rest = h.potSnapshots.filter((s) => !(s.month === a.month && a.balances[s.goalId] !== undefined));
      const added = Object.entries(a.balances).map(([goalId, balancePence]) => ({
        id: newId("pot"),
        goalId,
        month: a.month,
        balancePence,
      }));
      return { ...h, potSnapshots: [...rest, ...added] };
    }
    case "saveInvestmentSnapshots": {
      const rest = h.investmentSnapshots.filter((s) => !(s.month === a.month && a.values[s.accountId] !== undefined));
      const added = Object.entries(a.values).map(([accountId, valuePence]) => ({
        id: newId("is"),
        accountId,
        month: a.month,
        valuePence,
      }));
      return { ...h, investmentSnapshots: [...rest, ...added] };
    }
    case "updateAccount":
      return { ...h, accounts: replaceById(h.accounts, a.account) };
    case "addAccount":
      return { ...h, accounts: [...h.accounts, a.account] };
    case "deleteAccount":
      return { ...h, accounts: h.accounts.filter((x) => x.id !== a.id) };
    case "saveNetWorthSnapshot": {
      const rest = h.netWorthSnapshots.filter((s) => s.month !== a.month);
      return { ...h, netWorthSnapshots: [...rest, { id: newId("nw"), month: a.month, valuePence: a.valuePence }] };
    }
    case "updateSettings":
      return { ...h, settings: { ...h.settings, ...a.patch } };
    case "updateUserName":
      return { ...h, users: h.users.map((u) => (u.id === a.userId ? { ...u, name: a.name } : u)) as [User, User] };
    case "updatePledge":
      return {
        ...h,
        goals: h.goals.map((g) => {
          if (g.id !== a.goalId) return g;
          const exists = g.pledges.some((p) => p.userId === a.userId);
          const pledges = exists
            ? g.pledges.map((p) => (p.userId === a.userId ? { ...p, monthlyPence: a.monthlyPence } : p))
            : [...g.pledges, { goalId: g.id, userId: a.userId, monthlyPence: a.monthlyPence }];
          return { ...g, pledges };
        }),
      };
    case "addGoal":
      return { ...h, goals: [...h.goals, a.goal] };
    case "updateGoal":
      return { ...h, goals: replaceById(h.goals, a.goal) };
    case "archiveGoal":
      return { ...h, goals: h.goals.map((g) => (g.id === a.id ? { ...g, archived: true } : g)) };
    case "setEmergencyFund":
      return { ...h, goals: h.goals.map((g) => ({ ...g, isEmergencyFund: g.id === a.id })) };
    case "updateVariableBudget": {
      const exists = h.variableBudgets.some((v) => v.categoryId === a.categoryId);
      return {
        ...h,
        variableBudgets: exists
          ? h.variableBudgets.map((v) => (v.categoryId === a.categoryId ? { ...v, monthlyPence: a.monthlyPence } : v))
          : [...h.variableBudgets, { categoryId: a.categoryId, monthlyPence: a.monthlyPence }],
      };
    }
    case "addBill":
      return { ...h, bills: [...h.bills, a.bill] };
    case "updateBill":
      return { ...h, bills: replaceById(h.bills, a.bill) };
    case "archiveBill":
      return { ...h, bills: h.bills.map((b) => (b.id === a.id ? { ...b, archived: true } : b)) };
    case "upsertIncomeSource": {
      const exists = h.incomeSources.some((s) => s.id === a.source.id);
      return { ...h, incomeSources: exists ? replaceById(h.incomeSources, a.source) : [...h.incomeSources, a.source] };
    }
    case "deleteIncomeSource":
      return { ...h, incomeSources: h.incomeSources.filter((s) => s.id !== a.id) };
    case "addDebt":
      return { ...h, debts: [...h.debts, a.debt] };
    case "updateDebt":
      return { ...h, debts: replaceById(h.debts, a.debt) };
    case "deleteDebt":
      return { ...h, debts: h.debts.filter((d) => d.id !== a.id) };
    case "addInvestmentAccount":
      return { ...h, investmentAccounts: [...h.investmentAccounts, a.account] };
    case "updateInvestmentAccount":
      return { ...h, investmentAccounts: replaceById(h.investmentAccounts, a.account) };
    case "archiveInvestmentAccount":
      return {
        ...h,
        investmentAccounts: h.investmentAccounts.map((x) => (x.id === a.id ? { ...x, archived: true } : x)),
      };
    case "addCategory":
      return { ...h, categories: [...h.categories, a.category] };
    case "updateCategory":
      return { ...h, categories: replaceById(h.categories, a.category) };
    case "archiveCategory":
      return { ...h, categories: h.categories.map((c) => (c.id === a.id ? { ...c, archived: true } : c)) };
    default:
      return h;
  }
}

export interface HouseholdContextValue {
  household: Household;
  view: HouseholdView;
  clock: Clock;
  users: [User, User];
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  dispatch: (a: Action) => void;
  matrix: (startMonth: ISOMonth) => Matrix;
  userName: (id: string) => string;
  categoryName: (id: string) => string;
  categoryById: (id: string) => Category | undefined;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children, today = SEED_TODAY }: { children: ReactNode; today?: string }) {
  const [household, dispatch] = useReducer(reducer, undefined, cloneSeed);
  const [currentUserId, setCurrentUserId] = useState<string>(ADE);
  const clock = useMemo<Clock>(() => ({ today }), [today]);
  const view = useMemo(() => computeHouseholdView(household, clock), [household, clock]);
  const matrix = useCallback(
    (startMonth: ISOMonth) => computeBudgetMatrix(household, startMonth, clock),
    [household, clock],
  );
  const userName = useCallback(
    (id: string) => household.users.find((u) => u.id === id)?.name ?? "?",
    [household.users],
  );
  const categoryById = useCallback(
    (id: string) => household.categories.find((c) => c.id === id),
    [household.categories],
  );
  const categoryName = useCallback((id: string) => categoryById(id)?.name ?? "Uncategorised", [categoryById]);

  const value = useMemo<HouseholdContextValue>(
    () => ({
      household,
      view,
      clock,
      users: household.users,
      currentUserId,
      setCurrentUserId,
      dispatch,
      matrix,
      userName,
      categoryName,
      categoryById,
    }),
    [household, view, clock, currentUserId, matrix, userName, categoryName, categoryById],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used inside HouseholdProvider");
  return ctx;
}
