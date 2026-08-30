/**
 * Section 12 acceptance criteria. Seed data + a fixed clock of 28 Aug 2026.
 * Every value below is taken from the v2 workbook.
 */

import { describe, expect, it } from "vitest";
import { formatPence, formatShare, roundToPounds } from "@/domain/money";
import type { InvestmentAccount } from "@/domain/types";
import { ADE, BILL, CATEGORY, cloneSeed, GOAL, P, SEED_TODAY, seedHousehold } from "@/mock/fixtures";
import { computeHouseholdView } from "../index";

const clock = { today: SEED_TODAY };
const view = computeHouseholdView(seedHousehold, clock);
const pounds = (pence: number) => formatPence(pence, { style: "whole" });

describe("golden values (seed, 28 Aug 2026)", () => {
  it("effective shares 50% / 50%", () => {
    expect(formatShare(view.shares.share1)).toBe("50%");
    expect(formatShare(view.shares.share2)).toBe("50%");
  });

  it("household: income / fixed / variable / contributions", () => {
    expect(pounds(view.budget.incomePence)).toBe("£6,000");
    expect(pounds(view.budget.fixedPence)).toBe("£1,755");
    expect(pounds(view.budget.variablePence)).toBe("£1,020");
    expect(pounds(view.budget.contributionsPence)).toBe("£1,070");
  });

  it("household leftover / LISA bonus on top", () => {
    expect(pounds(view.budget.leftoverPence)).toBe("£2,155");
    expect(pounds(view.budget.bonusOnTopPence)).toBe("£125");
  });

  it("Ade: leftover / left of leftover", () => {
    const ade = view.persons[0];
    expect(ade.userId).toBe(ADE);
    expect(pounds(ade.leftoverPence)).toBe("£1,468");
    expect(pounds(ade.leftOfLeftoverPence)).toBe("£1,438");
  });

  it("P: leftover / left of leftover", () => {
    const p = view.persons[1];
    expect(p.userId).toBe(P);
    expect(pounds(p.leftoverPence)).toBe("£687");
    expect(pounds(p.leftOfLeftoverPence)).toBe("£687");
  });

  it("settle-up: Ade owes P £27.50", () => {
    expect(view.settleUp.direction).toBe("user1_owes_user2");
    expect(formatPence(Math.abs(view.settleUp.netPence))).toBe("£27.50");
  });

  it("actual: spent / transfers", () => {
    expect(formatPence(view.actuals.spentPence)).toBe("£1,644.50");
    expect(formatPence(view.actuals.transfersPence)).toBe("£250.00");
    expect(pounds(view.actuals.budgetTotalPence)).toBe("£2,775");
    expect(formatPence(view.actuals.leftInBudgetsPence)).toBe("£1,130.50");
  });

  it("bills: Rent Paid, Energy Paid, 5 Overdue", () => {
    const status = (id: string) => view.bills.bills.find((b) => b.bill.id === id)?.status;
    expect(status(BILL.rent)).toBe("paid");
    expect(status(BILL.energy)).toBe("paid");
    expect(view.bills.overdueCount).toBe(5);
    expect(view.actuals.overdueCount).toBe(5);
    expect(pounds(view.bills.totalJointBillsPence)).toBe("£1,620");
  });

  it("Ade's LISA: required £370.59, Behind by £58", () => {
    const lisa = view.goals.goals.find((g) => g.goal.id === GOAL.adeLisa);
    expect(lisa).toBeDefined();
    if (!lisa) return;
    expect(formatPence(lisa.requiredPence)).toBe("£370.59");
    expect(lisa.monthsLeft).toBe(34);
    expect(lisa.status.kind).toBe("behind");
    expect(roundToPounds(lisa.status.deltaPence)).toBe(58);
    expect(formatPence(lisa.lisaBonusPence)).toBe("£62.50");
  });

  it("all six goals carry the workbook's status", () => {
    const behind = Object.fromEntries(view.goals.goals.map((g) => [g.goal.name, roundToPounds(g.status.deltaPence)]));
    expect(behind).toEqual({
      "Ade's LISA": 58,
      "P's LISA": 76,
      Car: 120,
      Travel: 130,
      Wedding: 133,
      "General Savings": 71,
    });
  });

  it("pots latest total £7,550", () => {
    expect(pounds(view.goals.latestPotsTotalPence)).toBe("£7,550");
  });

  it("forecast totals now / +12m / +24m", () => {
    expect(view.forecast.rows).toHaveLength(25);
    expect(pounds(view.forecast.rows[0].goalsTotalPence)).toBe("£7,550");
    expect(pounds(view.forecast.rows[12].goalsTotalPence)).toBe("£21,890");
    expect(pounds(view.forecast.rows[24].goalsTotalPence)).toBe("£36,230");
    expect(view.forecast.rows[0].month).toBe("2026-08-01");
    expect(view.forecast.rows[24].month).toBe("2028-08-01");
  });

  it("house pot +12m / +24m", () => {
    expect(pounds(view.affordability.housePot12Pence)).toBe("£11,700");
    expect(pounds(view.affordability.housePot24Pence)).toBe("£19,200");
  });

  it("mortgage / indicative max price +24m", () => {
    expect(pounds(view.affordability.mortgagePence)).toBe("£324,000");
    expect(pounds(view.affordability.maxPrice24Pence)).toBe("£343,200");
  });

  it("emergency cover 0.7 months", () => {
    expect(view.emergency.months?.toFixed(1)).toBe("0.7");
  });

  it("net worth £7,550 with empty accounts", () => {
    expect(pounds(view.netWorth.totalPence)).toBe("£7,550");
    expect(view.netWorth.accountsPence).toBe(0);
  });
});

describe("behavioural criteria", () => {
  it("adding a shared transaction moves actuals and settle-up", () => {
    const h = cloneSeed();
    h.transactions.push({
      id: "txn-new",
      date: "2026-08-27",
      description: "Takeaway",
      categoryId: CATEGORY.eatingOut,
      amountPence: 2_000,
      paidBy: { kind: "user", userId: ADE },
      isShared: true,
      shareOverride: null,
      linkedBillId: null,
      linkedGoalId: null,
      linkedInvestmentId: null,
      notes: null,
    });
    const v = computeHouseholdView(h, clock);
    expect(formatPence(v.actuals.spentPence)).toBe("£1,664.50");
    // Ade paid £20 shared: Ade is owed £10, netting the £27.50 down to £17.50
    expect(v.settleUp.direction).toBe("user1_owes_user2");
    expect(formatPence(Math.abs(v.settleUp.netPence))).toBe("£17.50");
  });

  it("proportional split gives 56.7% / 43.3%", () => {
    const h = cloneSeed();
    h.settings.splitMethod = "proportional";
    const v = computeHouseholdView(h, clock);
    expect(formatShare(v.shares.share1)).toBe("56.7%");
    expect(formatShare(v.shares.share2)).toBe("43.3%");
    expect(pounds(v.persons[0].shareOfJointPence)).toBe("£1,496");
  });

  it("a £27.50 settlement from Ade to P shows All square", () => {
    const h = cloneSeed();
    h.settlements.push({ id: "s1", date: "2026-08-28", fromUserId: ADE, toUserId: P, amountPence: 2_750, notes: null });
    expect(computeHouseholdView(h, clock).settleUp.direction).toBe("square");
  });

  it("a £400/mo LISA pledge shows the allowance warning", () => {
    const h = cloneSeed();
    const lisa = h.goals.find((g) => g.id === GOAL.adeLisa);
    if (!lisa) throw new Error("missing goal");
    const pledge = lisa.pledges.find((p) => p.userId === ADE);
    if (!pledge) throw new Error("missing pledge");
    pledge.monthlyPence = 40_000;
    const v = computeHouseholdView(h, clock);
    const g = v.goals.goals.find((x) => x.goal.id === GOAL.adeLisa);
    expect(g?.lisaWarnings).toEqual([ADE]);
    // bonus is capped at the allowance: £333.33 x 25% = £83.33
    expect(formatPence(g?.lisaBonusPence ?? 0)).toBe("£83.33");
  });
});

describe("investments worked example (section 12)", () => {
  const isa: InvestmentAccount = {
    id: "inv-1",
    name: "S&S ISA",
    provider: "Vanguard",
    wrapper: "ss_isa",
    owner: { kind: "user", userId: ADE },
    monthlyContributionPence: 0,
    expectedGrowth: 0,
    contributedBeforePence: 500_000,
    notes: null,
    archived: false,
  };

  it("value £5,600, gain +£600 (+12.0%), net worth up by £5,600", () => {
    const h = cloneSeed();
    h.investmentAccounts.push(isa);
    h.investmentSnapshots.push({ id: "is-1", accountId: isa.id, month: "2026-08-01", valuePence: 560_000 });
    const v = computeHouseholdView(h, clock);
    const a = v.investments.accounts[0];
    expect(formatPence(a.valuePence)).toBe("£5,600.00");
    expect(formatPence(a.gainPence, { signed: true })).toBe("+£600.00");
    expect(a.gainPct?.toFixed(3)).toBe("0.120");
    expect(pounds(v.netWorth.totalPence)).toBe("£13,150");
  });

  it("6% growth and £200/mo gives month 1 = £5,828.00", () => {
    const h = cloneSeed();
    h.investmentAccounts.push({ ...isa, expectedGrowth: 0.06, monthlyContributionPence: 20_000 });
    h.investmentSnapshots.push({ id: "is-1", accountId: isa.id, month: "2026-08-01", valuePence: 560_000 });
    const v = computeHouseholdView(h, clock);
    expect(formatPence(v.investments.accounts[0].projectionPence[1])).toBe("£5,828.00");
    // the £200 planning contribution comes off Ade's leftover and the household's
    expect(pounds(v.persons[0].leftoverPence)).toBe("£1,268");
    expect(pounds(v.budget.leftoverPence)).toBe("£1,955");
    expect(pounds(v.forecast.rows[1].investmentsTotalPence)).toBe("£5,828");
  });

  it("logging a £200 contribution moves contributed to £5,200 and gain to +£400 (+7.7%)", () => {
    const h = cloneSeed();
    h.investmentAccounts.push(isa);
    h.investmentSnapshots.push({ id: "is-1", accountId: isa.id, month: "2026-08-01", valuePence: 560_000 });
    h.transactions.push({
      id: "txn-inv",
      date: "2026-08-28",
      description: "ISA top-up",
      categoryId: CATEGORY.investmentContribution,
      amountPence: 20_000,
      paidBy: { kind: "user", userId: ADE },
      isShared: false,
      shareOverride: null,
      linkedBillId: null,
      linkedGoalId: null,
      linkedInvestmentId: isa.id,
      notes: null,
    });
    const v = computeHouseholdView(h, clock);
    const a = v.investments.accounts[0];
    expect(formatPence(a.contributedPence)).toBe("£5,200.00");
    expect(formatPence(a.gainPence, { signed: true })).toBe("+£400.00");
    expect(((a.gainPct ?? 0) * 100).toFixed(1)).toBe("7.7");
    // the transfer is not spending
    expect(formatPence(v.actuals.spentPence)).toBe("£1,644.50");
    expect(formatPence(v.actuals.transfersPence)).toBe("£450.00");
  });
});
