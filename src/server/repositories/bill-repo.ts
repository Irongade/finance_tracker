import { and, asc, eq } from "drizzle-orm";
import type { Bill } from "@/domain/types";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { billToRow, rowToBill } from "./mappers";

export class BillRepository {
  constructor(private readonly db: Db) {}

  async list(householdId: string, h: DbHandle = this.db): Promise<Bill[]> {
    const rows = await h
      .select()
      .from(s.bills)
      .where(eq(s.bills.householdId, householdId))
      .orderBy(asc(s.bills.sort), asc(s.bills.createdAt));
    return rows.map(rowToBill);
  }

  async findById(householdId: string, id: string, h: DbHandle = this.db): Promise<Bill | null> {
    const [r] = await h
      .select()
      .from(s.bills)
      .where(and(eq(s.bills.id, id), eq(s.bills.householdId, householdId)))
      .limit(1);
    return r ? rowToBill(r) : null;
  }

  async insert(householdId: string, input: Omit<Bill, "id">, h: DbHandle = this.db): Promise<Bill> {
    const [r] = await h.insert(s.bills).values(billToRow(householdId, input)).returning();
    if (!r) throw new Error("bill insert returned nothing");
    return rowToBill(r);
  }

  async update(householdId: string, bill: Bill, h: DbHandle = this.db): Promise<Bill | null> {
    const [r] = await h
      .update(s.bills)
      .set(billToRow(householdId, bill))
      .where(and(eq(s.bills.id, bill.id), eq(s.bills.householdId, householdId)))
      .returning();
    return r ? rowToBill(r) : null;
  }

  /** Persists a drag-reorder: each id gets its index as the sort value. */
  async updateSort(householdId: string, ids: string[], h: DbHandle = this.db): Promise<void> {
    for (const [index, id] of ids.entries()) {
      await h
        .update(s.bills)
        .set({ sort: index })
        .where(and(eq(s.bills.id, id), eq(s.bills.householdId, householdId)));
    }
  }

  async delete(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.bills)
      .where(and(eq(s.bills.id, id), eq(s.bills.householdId, householdId)))
      .returning({ id: s.bills.id });
    return rows.length === 1;
  }
}
