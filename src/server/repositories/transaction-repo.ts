import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { addMonths } from "@/domain/dates";
import type { ISOMonth, Transaction } from "@/domain/types";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { rowToTransaction, transactionToRow } from "./mappers";

export class TransactionRepository {
  constructor(private readonly db: Db) {}

  async findById(householdId: string, id: string, h: DbHandle = this.db): Promise<Transaction | null> {
    const [r] = await h
      .select()
      .from(s.transactions)
      .where(and(eq(s.transactions.id, id), eq(s.transactions.householdId, householdId)))
      .limit(1);
    return r ? rowToTransaction(r) : null;
  }

  async listByMonth(householdId: string, month: ISOMonth, h: DbHandle = this.db): Promise<Transaction[]> {
    const rows = await h
      .select()
      .from(s.transactions)
      .where(
        and(
          eq(s.transactions.householdId, householdId),
          gte(s.transactions.date, month),
          lt(s.transactions.date, addMonths(month, 1)),
        ),
      )
      .orderBy(desc(s.transactions.date), desc(s.transactions.createdAt));
    return rows.map(rowToTransaction);
  }

  async listAll(householdId: string, h: DbHandle = this.db): Promise<Transaction[]> {
    const rows = await h
      .select()
      .from(s.transactions)
      .where(eq(s.transactions.householdId, householdId))
      .orderBy(asc(s.transactions.date));
    return rows.map(rowToTransaction);
  }

  async insert(householdId: string, input: Omit<Transaction, "id">, h: DbHandle = this.db): Promise<Transaction> {
    const [r] = await h.insert(s.transactions).values(transactionToRow(householdId, input)).returning();
    if (!r) throw new Error("transaction insert returned nothing");
    return rowToTransaction(r);
  }

  async update(householdId: string, txn: Transaction, h: DbHandle = this.db): Promise<Transaction | null> {
    const [r] = await h
      .update(s.transactions)
      .set(transactionToRow(householdId, txn))
      .where(and(eq(s.transactions.id, txn.id), eq(s.transactions.householdId, householdId)))
      .returning();
    return r ? rowToTransaction(r) : null;
  }

  async delete(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.transactions)
      .where(and(eq(s.transactions.id, id), eq(s.transactions.householdId, householdId)))
      .returning({ id: s.transactions.id });
    return rows.length === 1;
  }
}
