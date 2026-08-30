import { addMonths, monthOf } from "@/domain/dates";
import type { Clock, Forecast, ForecastRow, GoalsSummary, InvestmentsSummary, Pence } from "@/domain/types";
import { PROJECTION_MONTHS } from "./investments";

/** Section 5.11. 25 rows: now + 24 months, anchored to the latest balances. */
export function computeForecast(goals: GoalsSummary, investments: InvestmentsSummary, clock: Clock): Forecast {
  const start = monthOf(clock.today);
  const balances = new Map<string, Pence>(goals.goals.map((g) => [g.goal.id, g.savedPence]));
  const rows: ForecastRow[] = [];

  for (let n = 0; n <= PROJECTION_MONTHS; n++) {
    if (n > 0) {
      for (const g of goals.goals) {
        const prev = balances.get(g.goal.id) ?? 0;
        balances.set(g.goal.id, prev * (1 + g.goal.aer / 12) + g.pledgeTotalPence + g.lisaBonusPence);
      }
    }
    const goalRow: Record<string, Pence> = {};
    let goalsTotalPence = 0;
    let housePotPence = 0;
    for (const g of goals.goals) {
      const v = balances.get(g.goal.id) ?? 0;
      goalRow[g.goal.id] = v;
      goalsTotalPence += v;
      if (g.goal.type === "lisa") housePotPence += v;
    }
    const investmentRow: Record<string, Pence> = {};
    let investmentsTotalPence = 0;
    for (const a of investments.accounts) {
      const v = a.projectionPence[n] ?? 0;
      investmentRow[a.account.id] = v;
      investmentsTotalPence += v;
    }
    rows.push({
      index: n,
      month: addMonths(start, n),
      goals: goalRow,
      goalsTotalPence,
      housePotPence,
      investments: investmentRow,
      investmentsTotalPence,
      combinedTotalPence: goalsTotalPence + investmentsTotalPence,
    });
  }
  return { rows };
}
