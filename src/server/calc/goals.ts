import { monthsBetween } from "@/domain/dates";
import type { Clock, GoalsSummary, GoalView, Household, ISOMonth, Pence } from "@/domain/types";

export function latestPotByGoal(h: Household): Map<string, { month: ISOMonth; balancePence: Pence }> {
  const latest = new Map<string, { month: ISOMonth; balancePence: Pence }>();
  for (const s of h.potSnapshots) {
    const cur = latest.get(s.goalId);
    if (!cur || s.month > cur.month) latest.set(s.goalId, { month: s.month, balancePence: s.balancePence });
  }
  return latest;
}

/** Section 5.5, one view per active goal, plus household totals. */
export function computeGoals(h: Household, clock: Clock): GoalsSummary {
  const latest = latestPotByGoal(h);
  const monthlyAllowance = h.settings.lisaAnnualAllowancePence / 12;
  const pledgesByUser: Record<string, Pence> = {};
  for (const u of h.users) pledgesByUser[u.id] = 0;

  const goals: GoalView[] = [];
  let totalPledgesPence = 0;
  let totalLisaBonusPence = 0;
  let latestPotsTotalPence = 0;

  for (const goal of [...h.goals].filter((g) => !g.archived).sort((a, b) => a.sort - b.sort)) {
    const snap = latest.get(goal.id);
    const savedPence = snap?.balancePence ?? 0;
    let pledgeTotalPence = 0;
    const lisaWarnings: string[] = [];
    for (const p of goal.pledges) {
      pledgeTotalPence += p.monthlyPence;
      pledgesByUser[p.userId] = (pledgesByUser[p.userId] ?? 0) + p.monthlyPence;
      if (goal.type === "lisa" && p.monthlyPence > monthlyAllowance) lisaWarnings.push(p.userId);
    }
    const lisaBonusPence =
      goal.type === "lisa" ? Math.min(pledgeTotalPence, monthlyAllowance) * h.settings.lisaBonusRate : 0;
    const monthsLeft = Math.max(0, monthsBetween(clock.today, goal.targetDate));
    const gap = Math.max(0, goal.targetPence - savedPence);
    const requiredPence = monthsLeft === 0 ? gap : gap / monthsLeft;
    const monthly = pledgeTotalPence + lisaBonusPence;
    const status =
      monthly >= requiredPence
        ? ({ kind: "on_track", deltaPence: monthly - requiredPence } as const)
        : ({ kind: "behind", deltaPence: requiredPence - monthly } as const);

    totalPledgesPence += pledgeTotalPence;
    totalLisaBonusPence += lisaBonusPence;
    latestPotsTotalPence += savedPence;

    goals.push({
      goal,
      savedPence,
      savedMonth: snap?.month ?? null,
      pledgeTotalPence,
      lisaBonusPence,
      monthsLeft,
      requiredPence,
      status,
      lisaWarnings,
      progress: goal.targetPence > 0 ? savedPence / goal.targetPence : 0,
    });
  }

  return { goals, pledgesByUser, totalPledgesPence, totalLisaBonusPence, latestPotsTotalPence };
}
