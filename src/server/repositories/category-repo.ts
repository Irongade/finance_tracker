import { and, asc, eq, sql } from "drizzle-orm";
import type { Category } from "@/domain/types";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { rowToCategory } from "./mappers";

export class CategoryRepository {
  constructor(private readonly db: Db) {}

  async list(householdId: string, h: DbHandle = this.db): Promise<Category[]> {
    const rows = await h
      .select()
      .from(s.categories)
      .where(eq(s.categories.householdId, householdId))
      .orderBy(asc(s.categories.sort), asc(s.categories.name));
    return rows.map(rowToCategory);
  }

  async findById(householdId: string, id: string, h: DbHandle = this.db): Promise<Category | null> {
    const [r] = await h
      .select()
      .from(s.categories)
      .where(and(eq(s.categories.id, id), eq(s.categories.householdId, householdId)))
      .limit(1);
    return r ? rowToCategory(r) : null;
  }

  async findByName(householdId: string, name: string, h: DbHandle = this.db): Promise<Category | null> {
    const [r] = await h
      .select()
      .from(s.categories)
      .where(and(eq(s.categories.householdId, householdId), sql`lower(${s.categories.name}) = lower(${name})`))
      .limit(1);
    return r ? rowToCategory(r) : null;
  }

  async insert(householdId: string, input: Omit<Category, "id">, h: DbHandle = this.db): Promise<Category> {
    const [r] = await h
      .insert(s.categories)
      .values({ householdId, ...input })
      .returning();
    if (!r) throw new Error("category insert returned nothing");
    return rowToCategory(r);
  }

  async insertMany(householdId: string, inputs: Omit<Category, "id">[], h: DbHandle = this.db): Promise<Category[]> {
    if (inputs.length === 0) return [];
    const rows = await h
      .insert(s.categories)
      .values(inputs.map((c) => ({ householdId, ...c })))
      .returning();
    return rows.map(rowToCategory);
  }

  async update(householdId: string, category: Category, h: DbHandle = this.db): Promise<Category | null> {
    const [r] = await h
      .update(s.categories)
      .set({ name: category.name, type: category.type, sort: category.sort, archived: category.archived })
      .where(and(eq(s.categories.id, category.id), eq(s.categories.householdId, householdId)))
      .returning();
    return r ? rowToCategory(r) : null;
  }

  /** Transactions + bills referencing the category; deletion is blocked when > 0 (section 7.4). */
  async countUsage(householdId: string, id: string, h: DbHandle = this.db): Promise<number> {
    const [t] = await h
      .select({ n: sql<number>`count(*)::int` })
      .from(s.transactions)
      .where(and(eq(s.transactions.categoryId, id), eq(s.transactions.householdId, householdId)));
    const [b] = await h
      .select({ n: sql<number>`count(*)::int` })
      .from(s.bills)
      .where(and(eq(s.bills.categoryId, id), eq(s.bills.householdId, householdId)));
    return (t?.n ?? 0) + (b?.n ?? 0);
  }

  async delete(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.categories)
      .where(and(eq(s.categories.id, id), eq(s.categories.householdId, householdId)))
      .returning({ id: s.categories.id });
    return rows.length === 1;
  }
}
