"use client";

/**
 * Household store. The (app) layout loads the household on the server and
 * hydrates this provider; pages read synchronously; every mutation is applied
 * optimistically with the same calc engine the server uses, sent to the REST
 * API (section 6), and replaced by the server's copy when it lands. Inline
 * edits (pledges, budgets, balances) are coalesced before sending.
 */

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
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
import { type ApiRequest, api } from "@/lib/api";
import { computeBudgetMatrix, computeHouseholdView } from "@/server/calc";

export type Action =
  | { type: "replace"; household: Household }
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
  | { type: "updateHouseholdName"; name: string }
  | { type: "updatePledge"; goalId: string; userId: string; monthlyPence: number }
  | { type: "addGoal"; goal: Goal }
  | { type: "updateGoal"; goal: Goal }
  | { type: "archiveGoal"; id: string }
  | { type: "setEmergencyFund"; id: string }
  | { type: "updateVariableBudget"; categoryId: string; monthlyPence: number }
  | { type: "addBill"; bill: Bill }
  | { type: "updateBill"; bill: Bill }
  | { type: "archiveBill"; id: string }
  | { type: "reorderBills"; ids: string[] }
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
/** Temporary client id for optimistic rows; the server's id replaces it on the next response. */
export function newId(prefix: string): string {
  counter += 1;
  return `tmp-${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

function replaceById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.map((x) => (x.id === item.id ? item : x));
}

export function reducer(h: Household, a: Action): Household {
  switch (a.type) {
    case "replace":
      return a.household;
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
    case "updateHouseholdName":
      return { ...h, name: a.name };
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
    case "reorderBills": {
      const position = new Map(a.ids.map((id, i) => [id, i]));
      const bills = h.bills.map((b) => (position.has(b.id) ? { ...b, sort: position.get(b.id) ?? b.sort } : b));
      bills.sort((x, y) => x.sort - y.sort || x.name.localeCompare(y.name));
      return { ...h, bills };
    }
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

const stripId = <T extends { id: string }>({ id: _id, ...rest }: T) => rest;
const billBody = (b: Bill) => ({
  name: b.name,
  categoryId: b.categoryId,
  monthlyPence: b.monthlyPence,
  dueDay: b.dueDay,
  owner: b.owner,
  notes: b.notes,
});
const goalBody = (g: Goal) => ({
  name: g.name,
  type: g.type,
  targetPence: g.targetPence,
  targetDate: g.targetDate,
  aer: g.aer,
  isEmergencyFund: g.isEmergencyFund,
  notes: g.notes,
});
const investmentBody = (a: InvestmentAccount) => ({
  name: a.name,
  provider: a.provider,
  wrapper: a.wrapper,
  owner: a.owner,
  monthlyContributionPence: a.monthlyContributionPence,
  expectedGrowth: a.expectedGrowth,
  contributedBeforePence: a.contributedBeforePence,
  notes: a.notes,
});

/** Maps a store action onto the REST API (section 6). Returns null for local-only actions. */
export function actionToRequest(a: Action, before: Household): ApiRequest | null {
  switch (a.type) {
    case "replace":
      return null;
    case "addTransaction":
      return { method: "POST", url: "/api/transactions", body: stripId(a.txn) };
    case "updateTransaction":
      return { method: "PATCH", url: `/api/transactions/${a.txn.id}`, body: stripId(a.txn) };
    case "deleteTransaction":
      return { method: "DELETE", url: `/api/transactions/${a.id}` };
    case "addSettlement":
      return { method: "POST", url: "/api/settlements", body: stripId(a.settlement) };
    case "savePotSnapshots":
      return { method: "PUT", url: "/api/pot-snapshots", body: { month: a.month, values: a.balances } };
    case "saveInvestmentSnapshots":
      return { method: "PUT", url: "/api/investment-snapshots", body: { month: a.month, values: a.values } };
    case "updateAccount":
      return { method: "PATCH", url: `/api/accounts/${a.account.id}`, body: stripId(a.account) };
    case "addAccount":
      return { method: "POST", url: "/api/accounts", body: stripId(a.account) };
    case "deleteAccount":
      return { method: "DELETE", url: `/api/accounts/${a.id}` };
    case "saveNetWorthSnapshot":
      return { method: "PUT", url: "/api/net-worth-snapshots", body: { month: a.month, valuePence: a.valuePence } };
    case "updateSettings":
      return { method: "PATCH", url: "/api/settings", body: a.patch };
    case "updateHouseholdName":
      return { method: "PATCH", url: "/api/household", body: { name: a.name } };
    case "updateUserName":
      return { method: "PATCH", url: "/api/household", body: { members: [{ id: a.userId, name: a.name }] } };
    case "updatePledge":
      return {
        method: "PUT",
        url: `/api/goals/${a.goalId}/pledges`,
        body: { userId: a.userId, monthlyPence: a.monthlyPence },
      };
    case "addGoal":
      return {
        method: "POST",
        url: "/api/goals",
        body: {
          ...goalBody(a.goal),
          pledges: a.goal.pledges.map((p) => ({ userId: p.userId, monthlyPence: p.monthlyPence })),
        },
      };
    case "updateGoal":
      return { method: "PATCH", url: `/api/goals/${a.goal.id}`, body: goalBody(a.goal) };
    case "archiveGoal":
      return { method: "PATCH", url: `/api/goals/${a.id}`, body: { archived: true } };
    case "setEmergencyFund":
      return { method: "POST", url: `/api/goals/${a.id}/emergency-fund` };
    case "updateVariableBudget":
      return {
        method: "PUT",
        url: "/api/variable-budgets",
        body: { categoryId: a.categoryId, monthlyPence: a.monthlyPence },
      };
    case "addBill":
      return { method: "POST", url: "/api/bills", body: billBody(a.bill) };
    case "updateBill":
      return { method: "PATCH", url: `/api/bills/${a.bill.id}`, body: billBody(a.bill) };
    case "archiveBill":
      return { method: "PATCH", url: `/api/bills/${a.id}`, body: { archived: true } };
    case "reorderBills":
      return { method: "PUT", url: "/api/bills/order", body: { ids: a.ids } };
    case "upsertIncomeSource": {
      const exists = before.incomeSources.some((s) => s.id === a.source.id);
      const body = { userId: a.source.userId, name: a.source.name, monthlyPence: a.source.monthlyPence };
      return exists
        ? { method: "PATCH", url: `/api/income-sources/${a.source.id}`, body }
        : { method: "POST", url: "/api/income-sources", body };
    }
    case "deleteIncomeSource":
      return { method: "DELETE", url: `/api/income-sources/${a.id}` };
    case "addDebt":
      return { method: "POST", url: "/api/debts", body: stripId(a.debt) };
    case "updateDebt":
      return { method: "PATCH", url: `/api/debts/${a.debt.id}`, body: stripId(a.debt) };
    case "deleteDebt":
      return { method: "DELETE", url: `/api/debts/${a.id}` };
    case "addInvestmentAccount":
      return { method: "POST", url: "/api/investment-accounts", body: investmentBody(a.account) };
    case "updateInvestmentAccount":
      return { method: "PATCH", url: `/api/investment-accounts/${a.account.id}`, body: investmentBody(a.account) };
    case "archiveInvestmentAccount":
      return { method: "PATCH", url: `/api/investment-accounts/${a.id}`, body: { archived: true } };
    case "addCategory":
      return { method: "POST", url: "/api/categories", body: { name: a.category.name, type: a.category.type } };
    case "updateCategory":
      return {
        method: "PATCH",
        url: `/api/categories/${a.category.id}`,
        body: { name: a.category.name, type: a.category.type, archived: a.category.archived, sort: a.category.sort },
      };
    case "archiveCategory":
      return { method: "PATCH", url: `/api/categories/${a.id}`, body: { archived: true } };
    default:
      return null;
  }
}

/** Inline edits are coalesced per row before they hit the network. */
function debounceKey(a: Action): string | null {
  switch (a.type) {
    case "updatePledge":
      return `pledge:${a.goalId}:${a.userId}`;
    case "updateVariableBudget":
      return `budget:${a.categoryId}`;
    case "updateAccount":
      return `account:${a.account.id}`;
    case "upsertIncomeSource":
      return `income:${a.source.id}`;
    case "updateInvestmentAccount":
      return `invest:${a.account.id}`;
    case "updateSettings":
      return "settings";
    case "updateHouseholdName":
      return "household-name";
    case "updateUserName":
      return `name:${a.userId}`;
    case "updateCategory":
      return `category:${a.category.id}`;
    default:
      return null;
  }
}

const DEBOUNCE_MS = 600;
const REFRESH_MS = 60_000;

export interface HouseholdInitial {
  household: Household;
  currentUserId: string;
  today: string;
}

export interface HouseholdContextValue {
  household: Household;
  view: HouseholdView;
  clock: Clock;
  users: [User, User];
  currentUserId: string;
  /** Applies optimistically at once; the promise resolves true when the server accepted (debounced inline edits resolve immediately). */
  dispatch: (a: Action) => Promise<boolean>;
  matrix: (startMonth: ISOMonth) => Matrix;
  userName: (id: string) => string;
  categoryName: (id: string) => string;
  categoryById: (id: string) => Category | undefined;
  /** The transfer category to use when moving money into a pot or an investment. */
  transferCategoryId: (kind: "goal" | "investment") => string;
  refresh: () => Promise<void>;
  saving: boolean;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

interface Pending {
  req: ApiRequest;
  timer: ReturnType<typeof setTimeout>;
}

export function HouseholdProvider({ initial, children }: { initial: HouseholdInitial; children: ReactNode }) {
  const [household, apply] = useReducer(reducer, initial.household);
  const [inflight, setInflight] = useState(0);
  const householdRef = useRef(household);
  householdRef.current = household;
  const pendingRef = useRef(new Map<string, Pending>());
  const inflightRef = useRef(0);

  const clock = useMemo<Clock>(() => ({ today: initial.today }), [initial.today]);
  const view = useMemo(() => computeHouseholdView(household, clock), [household, clock]);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ household: Household }>({ method: "GET", url: "/api/household" });
      const quiet = inflightRef.current === 0 && pendingRef.current.size === 0;
      if (quiet) apply({ type: "replace", household: data.household });
    } catch {
      // offline or signed out; the next interaction will surface it
    }
  }, []);

  const send = useCallback(
    async (req: ApiRequest): Promise<boolean> => {
      inflightRef.current += 1;
      setInflight(inflightRef.current);
      try {
        const data = await api<{ household?: Household }>(req);
        if (data.household && inflightRef.current === 1 && pendingRef.current.size === 0)
          apply({ type: "replace", household: data.household });
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Something went wrong";
        toast.error("Not saved", { description: message });
        await refresh();
        return false;
      } finally {
        inflightRef.current -= 1;
        setInflight(inflightRef.current);
      }
    },
    [refresh],
  );

  const flush = useCallback(
    (keepalive = false) => {
      for (const [key, p] of pendingRef.current) {
        clearTimeout(p.timer);
        pendingRef.current.delete(key);
        void send({ ...p.req, keepalive });
      }
    },
    [send],
  );

  const dispatch = useCallback(
    async (a: Action): Promise<boolean> => {
      const before = householdRef.current;
      apply(a);
      const req = actionToRequest(a, before);
      if (!req) return true;
      const key = debounceKey(a);
      if (!key) {
        return send(req);
      }
      const existing = pendingRef.current.get(key);
      if (existing) clearTimeout(existing.timer);
      const timer = setTimeout(() => {
        pendingRef.current.delete(key);
        void send(req);
      }, DEBOUNCE_MS);
      pendingRef.current.set(key, { req, timer });
      return true;
    },
    [send],
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
      else void refresh();
    };
    const interval = setInterval(() => void refresh(), REFRESH_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", () => flush(true));
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush, refresh]);

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
  const transferCategoryId = useCallback(
    (kind: "goal" | "investment") => {
      const transfers = household.categories.filter((c) => c.type === "transfer" && !c.archived);
      const pick =
        kind === "investment"
          ? transfers.find((c) => /invest/i.test(c.name))
          : (transfers.find((c) => /saving|pot/i.test(c.name) && !/invest/i.test(c.name)) ??
            transfers.find((c) => !/invest/i.test(c.name)));
      return (pick ?? transfers[0])?.id ?? "";
    },
    [household.categories],
  );

  const value = useMemo<HouseholdContextValue>(
    () => ({
      household,
      view,
      clock,
      users: household.users,
      currentUserId: initial.currentUserId,
      dispatch,
      matrix,
      userName,
      categoryName,
      categoryById,
      transferCategoryId,
      refresh,
      saving: inflight > 0,
    }),
    [
      household,
      view,
      clock,
      initial.currentUserId,
      dispatch,
      matrix,
      userName,
      categoryName,
      categoryById,
      transferCategoryId,
      refresh,
      inflight,
    ],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used inside HouseholdProvider");
  return ctx;
}
