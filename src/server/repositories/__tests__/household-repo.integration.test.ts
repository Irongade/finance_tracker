/**
 * Repository integration test against a real Postgres (section 6.1). Needs
 * DATABASE_URL_TEST; skipped otherwise. Migrates, wipes, imports the workbook
 * through the services, then checks the round trip and the section 12 values.
 */
import { existsSync, readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatPence } from "@/domain/money";
import { createDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { parseWorkbook } from "@/server/import/workbook";
import { createServices } from "@/server/services";

const URL = process.env.DATABASE_URL_TEST;
const WORKBOOK = "data/Ade_P_Finance_Tracker_v2.xlsx";

describe.skipIf(!URL || !existsSync(WORKBOOK))("HouseholdRepository against Postgres", () => {
  const db = createDb(URL ?? "");
  const services = createServices(db, () => ({ today: "2026-08-28" }));
  let householdId = "";
  let memberId = "";

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.execute(sql`truncate table households, auth_user cascade`);
    const [user] = await db
      .insert(s.authUser)
      .values({ id: "test-user-1", name: "Ade", email: "ade@test.local" })
      .returning();
    const membership = await services.households.create(user.id, {
      name: "Ade & P",
      member1Name: "Ade",
      member2Name: "P",
    });
    householdId = membership.householdId;
    memberId = membership.memberId;
    await services.imports.importWorkbook(householdId, parseWorkbook(new Uint8Array(readFileSync(WORKBOOK))));
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("round-trips the household with members in position order", async () => {
    const h = await services.deps.repos.households.load(householdId);
    expect(h).not.toBeNull();
    if (!h) return;
    expect(h.users.map((u) => u.name)).toEqual(["Ade", "P"]);
    expect(h.users[0].email).toBe("ade@test.local");
    expect(h.users[1].email).toBeNull();
    expect(h.categories).toHaveLength(20);
    expect(h.bills).toHaveLength(13);
    expect(h.goals).toHaveLength(6);
    expect(h.goals.every((g) => g.pledges.length === 2)).toBe(true);
    expect(h.transactions).toHaveLength(9);
    expect(h.transactions.find((t) => t.description === "Rent")?.linkedBillId).toBe(
      h.bills.find((b) => b.name === "Rent")?.id,
    );
    expect(h.potSnapshots).toHaveLength(6);
  });

  it("reproduces the golden dashboard from the database", async () => {
    const { view } = await services.households.snapshot(householdId);
    expect(formatPence(view.budget.leftoverPence, { style: "whole" })).toBe("£2,155");
    expect(view.settleUp.direction).toBe("user1_owes_user2");
    expect(formatPence(Math.abs(view.settleUp.netPence))).toBe("£27.50");
    expect(view.bills.overdueCount).toBe(5);
    expect(formatPence(view.actuals.spentPence)).toBe("£1,644.50");
    expect(formatPence(view.forecast.rows[24].goalsTotalPence, { style: "whole" })).toBe("£36,230");
    expect(view.emergency.months?.toFixed(1)).toBe("0.7");
  });

  it("enforces invariants through the services", async () => {
    const h = await services.deps.repos.households.load(householdId);
    if (!h) throw new Error("household missing");
    const eatingOut = h.categories.find((c) => c.name === "Eating out");
    if (!eatingOut) throw new Error("category missing");
    const created = await services.transactions.create(householdId, {
      date: "2026-08-27",
      description: "Takeaway",
      categoryId: eatingOut.id,
      amountPence: 2_000,
      paidBy: { kind: "user", userId: memberId },
      isShared: true,
      shareOverride: null,
      linkedBillId: null,
      linkedGoalId: null,
      linkedInvestmentId: null,
      notes: null,
    });
    expect(formatPence(Math.abs(created.view.settleUp.netPence))).toBe("£17.50");
    await expect(
      services.transactions.create(householdId, {
        ...created.result,
        id: undefined as never,
        linkedBillId: h.bills[0].id,
        linkedGoalId: h.goals[0].id,
      } as never),
    ).rejects.toThrow();
    const removed = await services.transactions.delete(householdId, created.result.id);
    expect(formatPence(Math.abs(removed.view.settleUp.netPence))).toBe("£27.50");
    // one snapshot per goal per month: upsert, not duplicate
    const goal = h.goals[0];
    await services.snapshots.savePots(householdId, "2026-08-01", { [goal.id]: 250_000 });
    const after = await services.households.snapshot(householdId);
    expect(after.household.potSnapshots.filter((p) => p.goalId === goal.id && p.month === "2026-08-01")).toHaveLength(
      1,
    );
    await services.snapshots.savePots(householdId, "2026-08-01", { [goal.id]: 240_000 });
  });
});
