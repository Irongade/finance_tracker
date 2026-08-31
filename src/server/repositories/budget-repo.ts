import { and, eq, isNull } from "drizzle-orm";
import type { Owner, VariableBudget } from "@/domain/types";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { fromOwner, toOwner } from "./mappers";

export class VariableBudgetRepository {
  constructor(private readonly db: Db) {}

  async list(householdId: string, h: DbHandle = this.db): Promise<VariableBudget[]> {
    const rows = await h.select().from(s.variableBudgets).where(eq(s.variableBudgets.householdId, householdId));
    return rows.map((v) => ({
      categoryId: v.categoryId,
      owner: toOwner(v.owner, v.ownerMemberId),
      monthlyPence: v.monthlyPence,
    }));
  }

  /** One row per (category, owner); the partial unique indexes need a manual select-then-write. */
  async upsert(
    householdId: string,
    categoryId: string,
    owner: Owner,
    monthlyPence: number,
    h: DbHandle = this.db,
  ): Promise<VariableBudget> {
    const o = fromOwner(owner);
    const ownerMatch =
      o.kind === "joint"
        ? and(eq(s.variableBudgets.owner, "joint"), isNull(s.variableBudgets.ownerMemberId))
        : and(eq(s.variableBudgets.owner, "user"), eq(s.variableBudgets.ownerMemberId, o.memberId ?? ""));
    const [existing] = await h
      .select({ id: s.variableBudgets.id })
      .from(s.variableBudgets)
      .where(
        and(eq(s.variableBudgets.householdId, householdId), eq(s.variableBudgets.categoryId, categoryId), ownerMatch),
      )
      .limit(1);
    if (existing) {
      await h
        .update(s.variableBudgets)
        .set({ monthlyPence, updatedAt: new Date() })
        .where(eq(s.variableBudgets.id, existing.id));
    } else {
      await h
        .insert(s.variableBudgets)
        .values({ householdId, categoryId, owner: o.kind, ownerMemberId: o.memberId, monthlyPence });
    }
    return { categoryId, owner, monthlyPence };
  }

  /** Removes every owner's budget for a category (used when a category is deleted). */
  async deleteAllForCategory(householdId: string, categoryId: string, h: DbHandle = this.db): Promise<void> {
    await h
      .delete(s.variableBudgets)
      .where(and(eq(s.variableBudgets.categoryId, categoryId), eq(s.variableBudgets.householdId, householdId)));
  }
}
