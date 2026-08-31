/**
 * Section 5 calculation engine. Pure and deterministic: a Household plus a
 * Clock in, computed views out. Imports nothing from other layers.
 */
import type { Clock, Household, HouseholdView, ISOMonth, Matrix, MatrixLens } from "@/domain/types";
import { computeActuals } from "./actuals";
import { computeAffordability } from "./affordability";
import { computeBills } from "./bills";
import { categoryTypes } from "./classify";
import { computeDebts } from "./debts";
import { computeEmergencyCover } from "./emergency";
import { computeForecast } from "./forecast";
import { computeGoals } from "./goals";
import { computeHouseholdBudget } from "./household";
import { computeInvestments } from "./investments";
import { computeMatrix } from "./matrix";
import { computeNetWorth } from "./netWorth";
import { computePerson } from "./person";
import { computeSettleUp } from "./settleUp";
import { computeShares } from "./shares";

export function computeHouseholdView(h: Household, clock: Clock): HouseholdView {
  const types = categoryTypes(h);
  const shares = computeShares(h);
  const settleUp = computeSettleUp(h, shares, types);
  const bills = computeBills(h, clock);
  const goals = computeGoals(h, clock);
  const debts = computeDebts(h, clock);
  const investments = computeInvestments(h, types);
  const inputs = { shares, bills, goals, debts, investments, types };
  const persons: HouseholdView["persons"] = [
    computePerson(h, h.users[0].id, clock, inputs),
    computePerson(h, h.users[1].id, clock, inputs),
  ];
  const budget = computeHouseholdBudget(h, bills, goals, debts, investments);
  const actuals = computeActuals(h, clock, types, bills, debts);
  const forecast = computeForecast(goals, investments, clock);
  const affordability = computeAffordability(h, forecast);
  const emergency = computeEmergencyCover(goals, bills);
  const netWorth = computeNetWorth(h, goals, investments, debts);
  return {
    clock,
    shares,
    settleUp,
    bills,
    goals,
    persons,
    budget,
    actuals,
    debts,
    forecast,
    affordability,
    emergency,
    netWorth,
    investments,
  };
}

export function computeBudgetMatrix(
  h: Household,
  startMonth: ISOMonth,
  clock: Clock,
  lens: MatrixLens = "all",
): Matrix {
  return computeMatrix(h, startMonth, computeDebts(h, clock), categoryTypes(h), lens);
}

export { computeActuals } from "./actuals";
export { computeAffordability, LISA_PROPERTY_CAP_PENCE } from "./affordability";
export { computeBills } from "./bills";
export { categoryTypes, transactionType } from "./classify";
export { computeDebts, monthsToClear } from "./debts";
export { computeEmergencyCover } from "./emergency";
export { computeForecast } from "./forecast";
export { computeGoals } from "./goals";
export { computeHouseholdBudget } from "./household";
export { computeInvestments, projectInvestment } from "./investments";
export { computeMatrix, isOverBudget } from "./matrix";
export { computeNetWorth } from "./netWorth";
export { computePerson } from "./person";
export { computeSettleUp } from "./settleUp";
export { computeShares } from "./shares";
