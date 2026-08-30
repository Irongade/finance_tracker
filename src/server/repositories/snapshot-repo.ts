import { and, desc, eq, sql } from "drizzle-orm";
import type { InvestmentSnapshot, ISOMonth, NetWorthSnapshot, PotSnapshot } from "@/domain/types";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { rowToInvestmentSnapshot, rowToNetWorthSnapshot, rowToPotSnapshot } from "./mappers";

/** Month-end snapshots: one row per goal/account per month, upserted (section 9). */
export class SnapshotRepository {
  constructor(private readonly db: Db) {}

  async listPots(householdId: string, h: DbHandle = this.db): Promise<PotSnapshot[]> {
    const rows = await h
      .select()
      .from(s.potSnapshots)
      .where(eq(s.potSnapshots.householdId, householdId))
      .orderBy(desc(s.potSnapshots.month));
    return rows.map(rowToPotSnapshot);
  }

  async upsertPots(
    householdId: string,
    month: ISOMonth,
    balances: Record<string, number>,
    h: DbHandle = this.db,
  ): Promise<PotSnapshot[]> {
    const values = Object.entries(balances).map(([goalId, balancePence]) => ({
      householdId,
      goalId,
      month,
      balancePence,
    }));
    if (values.length === 0) return [];
    const rows = await h
      .insert(s.potSnapshots)
      .values(values)
      .onConflictDoUpdate({
        target: [s.potSnapshots.goalId, s.potSnapshots.month],
        set: { balancePence: sql`excluded.balance_pence`, updatedAt: new Date() },
      })
      .returning();
    return rows.map(rowToPotSnapshot);
  }

  async deletePot(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.potSnapshots)
      .where(and(eq(s.potSnapshots.id, id), eq(s.potSnapshots.householdId, householdId)))
      .returning({ id: s.potSnapshots.id });
    return rows.length === 1;
  }

  async listInvestments(householdId: string, h: DbHandle = this.db): Promise<InvestmentSnapshot[]> {
    const rows = await h
      .select()
      .from(s.investmentSnapshots)
      .where(eq(s.investmentSnapshots.householdId, householdId))
      .orderBy(desc(s.investmentSnapshots.month));
    return rows.map(rowToInvestmentSnapshot);
  }

  async upsertInvestments(
    householdId: string,
    month: ISOMonth,
    values: Record<string, number>,
    h: DbHandle = this.db,
  ): Promise<InvestmentSnapshot[]> {
    const rowsIn = Object.entries(values).map(([accountId, valuePence]) => ({
      householdId,
      accountId,
      month,
      valuePence,
    }));
    if (rowsIn.length === 0) return [];
    const rows = await h
      .insert(s.investmentSnapshots)
      .values(rowsIn)
      .onConflictDoUpdate({
        target: [s.investmentSnapshots.accountId, s.investmentSnapshots.month],
        set: { valuePence: sql`excluded.value_pence`, updatedAt: new Date() },
      })
      .returning();
    return rows.map(rowToInvestmentSnapshot);
  }

  async deleteInvestment(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.investmentSnapshots)
      .where(and(eq(s.investmentSnapshots.id, id), eq(s.investmentSnapshots.householdId, householdId)))
      .returning({ id: s.investmentSnapshots.id });
    return rows.length === 1;
  }

  async listNetWorth(householdId: string, h: DbHandle = this.db): Promise<NetWorthSnapshot[]> {
    const rows = await h
      .select()
      .from(s.netWorthSnapshots)
      .where(eq(s.netWorthSnapshots.householdId, householdId))
      .orderBy(desc(s.netWorthSnapshots.month));
    return rows.map(rowToNetWorthSnapshot);
  }

  async upsertNetWorth(
    householdId: string,
    month: ISOMonth,
    valuePence: number,
    h: DbHandle = this.db,
  ): Promise<NetWorthSnapshot> {
    const [r] = await h
      .insert(s.netWorthSnapshots)
      .values({ householdId, month, valuePence })
      .onConflictDoUpdate({
        target: [s.netWorthSnapshots.householdId, s.netWorthSnapshots.month],
        set: { valuePence, updatedAt: new Date() },
      })
      .returning();
    if (!r) throw new Error("net worth upsert returned nothing");
    return rowToNetWorthSnapshot(r);
  }

  async deleteNetWorth(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.netWorthSnapshots)
      .where(and(eq(s.netWorthSnapshots.id, id), eq(s.netWorthSnapshots.householdId, householdId)))
      .returning({ id: s.netWorthSnapshots.id });
    return rows.length === 1;
  }
}
