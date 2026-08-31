import type { Household, Pence } from "@/domain/types";

function activeVariableCategoryIds(h: Household): Set<string> {
  return new Set(h.categories.filter((c) => !c.archived && c.type === "variable").map((c) => c.id));
}

/** SUM(variable_budgets) over active variable categories — the household lens (section 5.7). */
export function totalVariableBudget(h: Household): Pence {
  const active = activeVariableCategoryIds(h);
  let total = 0;
  for (const b of h.variableBudgets) if (active.has(b.categoryId)) total += b.monthlyPence;
  return total;
}

/** Only joint budgets are split by the household rule (section 5.6, amended for per-person budgets). */
export function jointVariableBudget(h: Household): Pence {
  const active = activeVariableCategoryIds(h);
  let total = 0;
  for (const b of h.variableBudgets) if (b.owner.kind === "joint" && active.has(b.categoryId)) total += b.monthlyPence;
  return total;
}

/** A person's own variable budgets come straight off their leftover, like personal bills. */
export function personalVariableBudget(h: Household, userId: string): Pence {
  const active = activeVariableCategoryIds(h);
  let total = 0;
  for (const b of h.variableBudgets)
    if (b.owner.kind === "user" && b.owner.userId === userId && active.has(b.categoryId)) total += b.monthlyPence;
  return total;
}
