import { and, desc, eq } from "drizzle-orm";
import type { Settlement } from "@/domain/types";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { rowToSettlement } from "./mappers";

export class SettlementRepository {
  constructor(private readonly db: Db) {}

  async list(householdId: string, h: DbHandle = this.db): Promise<Settlement[]> {
    const rows = await h
      .select()
      .from(s.settlements)
      .where(eq(s.settlements.householdId, householdId))
      .orderBy(desc(s.settlements.date), desc(s.settlements.createdAt));
    return rows.map(rowToSettlement);
  }

  async insert(householdId: string, input: Omit<Settlement, "id">, h: DbHandle = this.db): Promise<Settlement> {
    const [r] = await h
      .insert(s.settlements)
      .values({
        householdId,
        date: input.date,
        fromMemberId: input.fromUserId,
        toMemberId: input.toUserId,
        amountPence: input.amountPence,
        notes: input.notes,
      })
      .returning();
    if (!r) throw new Error("settlement insert returned nothing");
    return rowToSettlement(r);
  }

  async delete(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.settlements)
      .where(and(eq(s.settlements.id, id), eq(s.settlements.householdId, householdId)))
      .returning({ id: s.settlements.id });
    return rows.length === 1;
  }
}
