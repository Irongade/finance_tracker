import { and, asc, eq, sql } from "drizzle-orm";
import type { Household, Settings, User } from "@/domain/types";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";
import {
  rowToAccount,
  rowToBill,
  rowToCategory,
  rowToDebt,
  rowToGoal,
  rowToIncomeSource,
  rowToInvestmentAccount,
  rowToInvestmentSnapshot,
  rowToNetWorthSnapshot,
  rowToPotSnapshot,
  rowToSettlement,
  rowToTransaction,
} from "./mappers";

type Thunk<T> = () => Promise<T>;
type Awaited2<T extends readonly Thunk<unknown>[]> = { [K in keyof T]: T[K] extends Thunk<infer R> ? R : never };

/**
 * In parallel on the pool; one at a time inside a transaction, where pg has a
 * single client and queueing queries on it is deprecated.
 */
async function runAll<const T extends readonly Thunk<unknown>[]>(parallel: boolean, thunks: T): Promise<Awaited2<T>> {
  if (parallel) return (await Promise.all(thunks.map((t) => t()))) as Awaited2<T>;
  const out: unknown[] = [];
  for (const t of thunks) out.push(await t());
  return out as Awaited2<T>;
}

export interface Membership {
  householdId: string;
  memberId: string;
  position: 1 | 2;
}

/**
 * The household aggregate root: everything the calc engine needs, loaded in
 * one parallel batch, plus membership lookups for the session layer.
 */
export class HouseholdRepository {
  constructor(private readonly db: Db) {}

  async findMembership(authUserId: string, h: DbHandle = this.db): Promise<Membership | null> {
    const rows = await h
      .select({
        householdId: s.householdMembers.householdId,
        memberId: s.householdMembers.id,
        position: s.householdMembers.position,
      })
      .from(s.householdMembers)
      .where(eq(s.householdMembers.authUserId, authUserId))
      .limit(1);
    const r = rows[0];
    return r ? { householdId: r.householdId, memberId: r.memberId, position: r.position as 1 | 2 } : null;
  }

  async countHouseholds(h: DbHandle = this.db): Promise<number> {
    const [r] = await h.select({ n: sql<number>`count(*)::int` }).from(s.households);
    return r?.n ?? 0;
  }

  async create(
    input: { name: string; member1Name: string; member2Name: string; authUserId: string },
    h: DbHandle = this.db,
  ): Promise<Membership> {
    const [hh] = await h.insert(s.households).values({ name: input.name }).returning({ id: s.households.id });
    if (!hh) throw new Error("household insert returned nothing");
    const [m1] = await h
      .insert(s.householdMembers)
      .values([
        { householdId: hh.id, position: 1, name: input.member1Name, authUserId: input.authUserId },
        { householdId: hh.id, position: 2, name: input.member2Name, authUserId: null },
      ])
      .returning({ id: s.householdMembers.id, position: s.householdMembers.position });
    await h.insert(s.settings).values({ householdId: hh.id });
    if (!m1) throw new Error("member insert returned nothing");
    return { householdId: hh.id, memberId: m1.id, position: 1 };
  }

  async updateName(householdId: string, name: string, h: DbHandle = this.db): Promise<void> {
    await h.update(s.households).set({ name }).where(eq(s.households.id, householdId));
  }

  async updateMemberName(householdId: string, memberId: string, name: string, h: DbHandle = this.db): Promise<void> {
    await h
      .update(s.householdMembers)
      .set({ name })
      .where(and(eq(s.householdMembers.id, memberId), eq(s.householdMembers.householdId, householdId)));
  }

  /** Binds an auth account to the member slot; returns false if the slot is already taken. */
  async linkMember(householdId: string, position: number, authUserId: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .update(s.householdMembers)
      .set({ authUserId })
      .where(
        and(
          eq(s.householdMembers.householdId, householdId),
          eq(s.householdMembers.position, position),
          sql`${s.householdMembers.authUserId} is null`,
        ),
      )
      .returning({ id: s.householdMembers.id });
    return rows.length === 1;
  }

  /** Swaps which login is which person. Both seats must be linked; unique index dodged via a two-step update. */
  async swapMemberAuth(householdId: string, h: DbHandle = this.db): Promise<boolean> {
    const members = await h
      .select({ id: s.householdMembers.id, authUserId: s.householdMembers.authUserId })
      .from(s.householdMembers)
      .where(eq(s.householdMembers.householdId, householdId))
      .orderBy(asc(s.householdMembers.position));
    const [m1, m2] = members;
    if (!m1?.authUserId || !m2?.authUserId) return false;
    await h.update(s.householdMembers).set({ authUserId: null }).where(eq(s.householdMembers.id, m1.id));
    await h.update(s.householdMembers).set({ authUserId: m1.authUserId }).where(eq(s.householdMembers.id, m2.id));
    await h.update(s.householdMembers).set({ authUserId: m2.authUserId }).where(eq(s.householdMembers.id, m1.id));
    return true;
  }

  async getSettings(householdId: string, h: DbHandle = this.db): Promise<Settings | null> {
    const [r] = await h.select().from(s.settings).where(eq(s.settings.householdId, householdId)).limit(1);
    return r
      ? {
          splitMethod: r.splitMethod,
          customShareUser1: r.customShareUser1,
          lisaBonusRate: r.lisaBonusRate,
          lisaAnnualAllowancePence: r.lisaAnnualAllowancePence,
          mortgageMultiple: r.mortgageMultiple,
          grossAnnualIncomeUser1Pence: r.grossAnnualIncomeUser1Pence,
          grossAnnualIncomeUser2Pence: r.grossAnnualIncomeUser2Pence,
        }
      : null;
  }

  async updateSettings(householdId: string, patch: Partial<Settings>, h: DbHandle = this.db): Promise<void> {
    await h.update(s.settings).set(patch).where(eq(s.settings.householdId, householdId));
  }

  async load(householdId: string, h: DbHandle = this.db): Promise<Household | null> {
    const hid = householdId;
    const [
      household,
      members,
      settingsRow,
      categories,
      incomeSources,
      bills,
      goals,
      pledges,
      transactions,
      settlements,
      potSnapshots,
      accounts,
      netWorthSnapshots,
      debts,
      investmentAccounts,
      investmentSnapshots,
      variableBudgets,
    ] = await runAll(h === this.db, [
      () => h.select().from(s.households).where(eq(s.households.id, hid)).limit(1),
      () =>
        h
          .select({
            id: s.householdMembers.id,
            position: s.householdMembers.position,
            name: s.householdMembers.name,
            email: s.authUser.email,
          })
          .from(s.householdMembers)
          .leftJoin(s.authUser, eq(s.authUser.id, s.householdMembers.authUserId))
          .where(eq(s.householdMembers.householdId, hid))
          .orderBy(asc(s.householdMembers.position)),
      () => this.getSettings(hid, h),
      () =>
        h
          .select()
          .from(s.categories)
          .where(eq(s.categories.householdId, hid))
          .orderBy(asc(s.categories.sort), asc(s.categories.name)),
      () =>
        h
          .select()
          .from(s.incomeSources)
          .where(eq(s.incomeSources.householdId, hid))
          .orderBy(asc(s.incomeSources.createdAt)),
      () =>
        h.select().from(s.bills).where(eq(s.bills.householdId, hid)).orderBy(asc(s.bills.sort), asc(s.bills.createdAt)),
      () =>
        h.select().from(s.goals).where(eq(s.goals.householdId, hid)).orderBy(asc(s.goals.sort), asc(s.goals.createdAt)),
      () => h.select().from(s.goalPledges).where(eq(s.goalPledges.householdId, hid)),
      () =>
        h
          .select()
          .from(s.transactions)
          .where(eq(s.transactions.householdId, hid))
          .orderBy(asc(s.transactions.date), asc(s.transactions.createdAt)),
      () => h.select().from(s.settlements).where(eq(s.settlements.householdId, hid)).orderBy(asc(s.settlements.date)),
      () => h.select().from(s.potSnapshots).where(eq(s.potSnapshots.householdId, hid)),
      () => h.select().from(s.accounts).where(eq(s.accounts.householdId, hid)).orderBy(asc(s.accounts.createdAt)),
      () =>
        h
          .select()
          .from(s.netWorthSnapshots)
          .where(eq(s.netWorthSnapshots.householdId, hid))
          .orderBy(asc(s.netWorthSnapshots.month)),
      () => h.select().from(s.debts).where(eq(s.debts.householdId, hid)).orderBy(asc(s.debts.createdAt)),
      () =>
        h
          .select()
          .from(s.investmentAccounts)
          .where(eq(s.investmentAccounts.householdId, hid))
          .orderBy(asc(s.investmentAccounts.createdAt)),
      () => h.select().from(s.investmentSnapshots).where(eq(s.investmentSnapshots.householdId, hid)),
      () => h.select().from(s.variableBudgets).where(eq(s.variableBudgets.householdId, hid)),
    ]);

    const hh = household[0];
    if (!hh || !settingsRow || members.length !== 2) return null;
    const users = members.map((m) => ({
      id: m.id,
      position: m.position as 1 | 2,
      name: m.name,
      email: m.email ?? null,
    })) as [User, User];
    const pledgesByGoal = new Map<string, { goalId: string; userId: string; monthlyPence: number }[]>();
    for (const p of pledges) {
      const list = pledgesByGoal.get(p.goalId) ?? [];
      list.push({ goalId: p.goalId, userId: p.memberId, monthlyPence: p.monthlyPence });
      pledgesByGoal.set(p.goalId, list);
    }

    return {
      id: hh.id,
      name: hh.name,
      users,
      settings: settingsRow,
      categories: categories.map(rowToCategory),
      incomeSources: incomeSources.map(rowToIncomeSource),
      bills: bills.map(rowToBill),
      goals: goals.map((g) => rowToGoal(g, pledgesByGoal.get(g.id) ?? [])),
      transactions: transactions.map(rowToTransaction),
      settlements: settlements.map(rowToSettlement),
      potSnapshots: potSnapshots.map(rowToPotSnapshot),
      accounts: accounts.map(rowToAccount),
      netWorthSnapshots: netWorthSnapshots.map(rowToNetWorthSnapshot),
      debts: debts.map(rowToDebt),
      investmentAccounts: investmentAccounts.map(rowToInvestmentAccount),
      investmentSnapshots: investmentSnapshots.map(rowToInvestmentSnapshot),
      variableBudgets: variableBudgets.map((v) => ({ categoryId: v.categoryId, monthlyPence: v.monthlyPence })),
    };
  }
}
