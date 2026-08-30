import type { CategoryType, Household, InvestmentsSummary, InvestmentView, ISOMonth, Pence } from "@/domain/types";
import { transactionType } from "./classify";

export const PROJECTION_MONTHS = 24;

export function latestValueByAccount(h: Household): Map<string, { month: ISOMonth; valuePence: Pence }> {
  const latest = new Map<string, { month: ISOMonth; valuePence: Pence }>();
  for (const s of h.investmentSnapshots) {
    const cur = latest.get(s.accountId);
    if (!cur || s.month > cur.month) latest.set(s.accountId, { month: s.month, valuePence: s.valuePence });
  }
  return latest;
}

/** v(n+1) = v(n) x (1 + growth/12) + contribution, 25 values. */
export function projectInvestment(valuePence: Pence, expectedGrowth: number, monthlyContributionPence: Pence): Pence[] {
  const out = [valuePence];
  for (let i = 0; i < PROJECTION_MONTHS; i++) {
    out.push(out[i] * (1 + expectedGrowth / 12) + monthlyContributionPence);
  }
  return out;
}

/** Section 5.15. */
export function computeInvestments(h: Household, types: Map<string, CategoryType>): InvestmentsSummary {
  const latest = latestValueByAccount(h);
  const contributedByAccount = new Map<string, Pence>();
  for (const t of h.transactions) {
    if (t.linkedInvestmentId && transactionType(t, types) === "transfer") {
      contributedByAccount.set(
        t.linkedInvestmentId,
        (contributedByAccount.get(t.linkedInvestmentId) ?? 0) + t.amountPence,
      );
    }
  }

  let totalValuePence = 0;
  let totalContributedPence = 0;
  let totalMonthlyContributionPence = 0;
  const accounts: InvestmentView[] = h.investmentAccounts
    .filter((a) => !a.archived)
    .map((account) => {
      const snap = latest.get(account.id);
      const valuePence = snap?.valuePence ?? 0;
      const contributedPence = account.contributedBeforePence + (contributedByAccount.get(account.id) ?? 0);
      const gainPence = valuePence - contributedPence;
      totalValuePence += valuePence;
      totalContributedPence += contributedPence;
      totalMonthlyContributionPence += account.monthlyContributionPence;
      return {
        account,
        valuePence,
        valueMonth: snap?.month ?? null,
        contributedPence,
        gainPence,
        gainPct: contributedPence > 0 ? gainPence / contributedPence : null,
        projectionPence: projectInvestment(valuePence, account.expectedGrowth, account.monthlyContributionPence),
      };
    });

  const totalGainPence = totalValuePence - totalContributedPence;
  return {
    accounts,
    totalValuePence,
    totalContributedPence,
    totalGainPence,
    totalGainPct: totalContributedPence > 0 ? totalGainPence / totalContributedPence : null,
    totalMonthlyContributionPence,
  };
}
