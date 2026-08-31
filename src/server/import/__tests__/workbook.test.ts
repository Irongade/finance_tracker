import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { excelSerialToISO, parseWorkbook, toPence } from "../workbook";

const WORKBOOK = "data/Ade_P_Finance_Tracker_v2.xlsx";

describe("workbook helpers", () => {
  it("converts Excel serials and pounds", () => {
    expect(excelSerialToISO(46235)).toBe("2026-08-01");
    expect(excelSerialToISO(47270)).toBe("2029-06-01");
    expect(toPence(82.4)).toBe(8240);
    expect(toPence("£1,200.50")).toBe(120050);
    expect(toPence(null)).toBe(0);
  });
});

describe.skipIf(!existsSync(WORKBOOK))("parseWorkbook (section 11)", () => {
  // parsed lazily: a skipped suite still has its body executed during collection,
  // and CI has no workbook (it is deliberately gitignored)
  let data: ReturnType<typeof parseWorkbook>;
  beforeAll(() => {
    data = parseWorkbook(new Uint8Array(readFileSync(WORKBOOK)));
  });

  it("reads settings and names", () => {
    expect(data.memberNames).toEqual(["Ade", "P"]);
    expect(data.settings).toEqual({
      splitMethod: "fifty_fifty",
      customShareUser1: 0.5,
      lisaBonusRate: 0.25,
      lisaAnnualAllowancePence: 400_000,
      mortgageMultiple: 4.5,
    });
  });

  it("reads 20 categories including the added Investment contribution", () => {
    expect(data.categories).toHaveLength(20);
    expect(data.categories.filter((c) => c.type === "transfer").map((c) => c.name)).toEqual([
      "Savings transfer",
      "Investment contribution",
    ]);
  });

  it("reads 7 joint bills and 6 personal bills", () => {
    expect(data.bills.filter((b) => b.owner === "joint")).toHaveLength(7);
    expect(data.bills.filter((b) => b.owner === 1)).toHaveLength(3);
    expect(data.bills.filter((b) => b.owner === 2)).toHaveLength(3);
    expect(data.bills.find((b) => b.name === "Energy")).toMatchObject({
      category: "Utilities",
      monthlyPence: 14_000,
      dueDay: 15,
    });
    expect(data.bills.find((b) => b.name === "Spotify")).toMatchObject({ owner: 1, monthlyPence: 1_200, dueDay: null });
  });

  it("reads 6 goals with pledges and target dates", () => {
    expect(data.goals).toHaveLength(6);
    expect(data.goals[0]).toMatchObject({
      name: "Ade's LISA",
      type: "lisa",
      targetPence: 1_500_000,
      targetDate: "2029-06-01",
      pledges: [25_000, 0],
    });
    expect(data.goals.find((g) => g.name === "General Savings")?.isEmergencyFund).toBe(true);
    expect(data.goals.filter((g) => g.isEmergencyFund)).toHaveLength(1);
  });

  it("reads incomes, budgets, the August snapshot and 9 transactions", () => {
    expect(data.incomeSources.filter((s) => s.position === 1).reduce((a, s) => a + s.monthlyPence, 0)).toBe(340_000);
    expect(data.variableBudgets.reduce((a, v) => a + v.monthlyPence, 0)).toBe(102_000);
    expect(data.potSnapshots).toHaveLength(1);
    expect(data.potSnapshots[0].month).toBe("2026-08-01");
    expect(Object.values(data.potSnapshots[0].balances).reduce((a, b) => a + b, 0)).toBe(755_000);
    expect(data.transactions).toHaveLength(9);
    expect(data.transactions[4]).toMatchObject({
      description: "Petrol",
      paidBy: 2,
      isShared: true,
      amountPence: 5_500,
    });
    expect(data.transactions[8]).toMatchObject({ category: "Savings transfer", linkedGoal: "Ade's LISA", paidBy: 1 });
    expect(data.accounts).toHaveLength(3);
    expect(data.debts).toHaveLength(0);
  });
});
