import type { DebtsSummary, GoalsSummary, Household, InvestmentsSummary, NetWorth } from "@/domain/types";

/** Section 5.14. */
export function computeNetWorth(
  h: Household,
  goals: GoalsSummary,
  investments: InvestmentsSummary,
  debts: DebtsSummary,
): NetWorth {
  let accountsPence = 0;
  for (const a of h.accounts) accountsPence += a.balancePence;
  const potsPence = goals.latestPotsTotalPence;
  const investmentsPence = investments.totalValuePence;
  const debtsPence = debts.totalBalancePence;
  return {
    accountsPence,
    potsPence,
    investmentsPence,
    debtsPence,
    totalPence: accountsPence + potsPence + investmentsPence - debtsPence,
  };
}
