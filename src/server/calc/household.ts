import type {
  BillsSummary,
  DebtsSummary,
  GoalsSummary,
  Household,
  HouseholdBudget,
  InvestmentsSummary,
} from "@/domain/types";
import { totalPersonalBills } from "./bills";
import { totalVariableBudget } from "./budgets";
import { incomeFor } from "./shares";

/** Section 5.7. */
export function computeHouseholdBudget(
  h: Household,
  bills: BillsSummary,
  goals: GoalsSummary,
  debts: DebtsSummary,
  investments: InvestmentsSummary,
): HouseholdBudget {
  const incomePence = incomeFor(h, h.users[0].id) + incomeFor(h, h.users[1].id);
  const fixedPence = bills.totalJointBillsPence + totalPersonalBills(bills);
  const variablePence = totalVariableBudget(h);
  const contributionsPence = goals.totalPledgesPence;
  const debtPence = debts.totalPaymentPence;
  const investingPence = investments.totalMonthlyContributionPence;
  return {
    incomePence,
    fixedPence,
    variablePence,
    contributionsPence,
    debtPence,
    investingPence,
    leftoverPence: incomePence - fixedPence - variablePence - contributionsPence - debtPence - investingPence,
    bonusOnTopPence: goals.totalLisaBonusPence,
  };
}
