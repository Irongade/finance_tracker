import { variableBudgetSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { household } = await ctx.services.households.snapshot(ctx.householdId);
  return json({ variableBudgets: household.variableBudgets });
});

/** Upsert one category's monthly budget (fixed budgets are derived from the bills). */
export const PUT = handler(async (req) => {
  const ctx = await requireContext(req);
  const { categoryId, owner, monthlyPence } = await parseBody(req, variableBudgetSchema);
  return json(await ctx.services.budgets.setVariableBudget(ctx.householdId, categoryId, owner, monthlyPence));
});
