import { and, eq } from "drizzle-orm";
import type { VariableBudget } from "@/domain/types";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";

export class VariableBudgetRepository {
  constructor(private readonly db: Db) {}

  async list(householdId: string, h: DbHandle = this.db): Promise<VariableBudget[]> {
    const rows = await h.select().from(s.variableBudgets).where(eq(s.variableBudgets.householdId, householdId));
    return rows.map((v) => ({ categoryId: v.categoryId, monthlyPence: v.monthlyPence }));
  }

  async upsert(
    householdId: string,
    categoryId: string,
    monthlyPence: number,
    h: DbHandle = this.db,
  ): Promise<VariableBudget> {
    const [r] = await h
      .insert(s.variableBudgets)
      .values({ householdId, categoryId, monthlyPence })
      .onConflictDoUpdate({ target: s.variableBudgets.categoryId, set: { monthlyPence, updatedAt: new Date() } })
      .returning();
    if (!r) throw new Error("variable budget upsert returned nothing");
    return { categoryId: r.categoryId, monthlyPence: r.monthlyPence };
  }

  async delete(householdId: string, categoryId: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.variableBudgets)
      .where(and(eq(s.variableBudgets.categoryId, categoryId), eq(s.variableBudgets.householdId, householdId)))
      .returning({ id: s.variableBudgets.id });
    return rows.length === 1;
  }
}
