import type { Household, Pence } from "@/domain/types";

/** SUM(variable_budgets) over active variable categories. */
export function totalVariableBudget(h: Household): Pence {
  const active = new Set(h.categories.filter((c) => !c.archived && c.type === "variable").map((c) => c.id));
  let total = 0;
  for (const b of h.variableBudgets) if (active.has(b.categoryId)) total += b.monthlyPence;
  return total;
}
