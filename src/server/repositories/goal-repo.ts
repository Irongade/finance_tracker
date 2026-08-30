import { and, asc, eq, sql } from "drizzle-orm";
import type { Goal, GoalPledge } from "@/domain/types";
import type { Db, DbHandle } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { goalToRow, rowToGoal } from "./mappers";

export class GoalRepository {
  constructor(private readonly db: Db) {}

  private async pledgesFor(householdId: string, goalIds: string[], h: DbHandle): Promise<Map<string, GoalPledge[]>> {
    const map = new Map<string, GoalPledge[]>();
    if (goalIds.length === 0) return map;
    const rows = await h.select().from(s.goalPledges).where(eq(s.goalPledges.householdId, householdId));
    for (const p of rows) {
      if (!goalIds.includes(p.goalId)) continue;
      const list = map.get(p.goalId) ?? [];
      list.push({ goalId: p.goalId, userId: p.memberId, monthlyPence: p.monthlyPence });
      map.set(p.goalId, list);
    }
    return map;
  }

  async list(householdId: string, h: DbHandle = this.db): Promise<Goal[]> {
    const rows = await h
      .select()
      .from(s.goals)
      .where(eq(s.goals.householdId, householdId))
      .orderBy(asc(s.goals.sort), asc(s.goals.createdAt));
    const pledges = await this.pledgesFor(
      householdId,
      rows.map((g) => g.id),
      h,
    );
    return rows.map((g) => rowToGoal(g, pledges.get(g.id) ?? []));
  }

  async findById(householdId: string, id: string, h: DbHandle = this.db): Promise<Goal | null> {
    const [g] = await h
      .select()
      .from(s.goals)
      .where(and(eq(s.goals.id, id), eq(s.goals.householdId, householdId)))
      .limit(1);
    if (!g) return null;
    const pledges = await this.pledgesFor(householdId, [g.id], h);
    return rowToGoal(g, pledges.get(g.id) ?? []);
  }

  async insert(householdId: string, input: Omit<Goal, "id">, h: DbHandle = this.db): Promise<Goal> {
    const [g] = await h.insert(s.goals).values(goalToRow(householdId, input)).returning();
    if (!g) throw new Error("goal insert returned nothing");
    if (input.pledges.length) {
      await h
        .insert(s.goalPledges)
        .values(
          input.pledges.map((p) => ({ householdId, goalId: g.id, memberId: p.userId, monthlyPence: p.monthlyPence })),
        );
    }
    return rowToGoal(
      g,
      input.pledges.map((p) => ({ ...p, goalId: g.id })),
    );
  }

  /** Updates the goal's own columns; pledges are managed with upsertPledge. */
  async update(householdId: string, goal: Goal, h: DbHandle = this.db): Promise<Goal | null> {
    const [g] = await h
      .update(s.goals)
      .set(goalToRow(householdId, goal))
      .where(and(eq(s.goals.id, goal.id), eq(s.goals.householdId, householdId)))
      .returning();
    return g ? rowToGoal(g, goal.pledges) : null;
  }

  async upsertPledge(
    householdId: string,
    goalId: string,
    memberId: string,
    monthlyPence: number,
    h: DbHandle = this.db,
  ): Promise<GoalPledge> {
    const [r] = await h
      .insert(s.goalPledges)
      .values({ householdId, goalId, memberId, monthlyPence })
      .onConflictDoUpdate({
        target: [s.goalPledges.goalId, s.goalPledges.memberId],
        set: { monthlyPence, updatedAt: new Date() },
      })
      .returning();
    if (!r) throw new Error("pledge upsert returned nothing");
    return { goalId: r.goalId, userId: r.memberId, monthlyPence: r.monthlyPence };
  }

  /** Exactly one emergency fund per household. */
  async setEmergencyFund(householdId: string, goalId: string, h: DbHandle = this.db): Promise<void> {
    await h
      .update(s.goals)
      .set({ isEmergencyFund: sql`(${s.goals.id} = ${goalId})` })
      .where(eq(s.goals.householdId, householdId));
  }

  async delete(householdId: string, id: string, h: DbHandle = this.db): Promise<boolean> {
    const rows = await h
      .delete(s.goals)
      .where(and(eq(s.goals.id, id), eq(s.goals.householdId, householdId)))
      .returning({ id: s.goals.id });
    return rows.length === 1;
  }
}
