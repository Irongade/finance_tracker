import { debtInputSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { view } = await ctx.services.households.snapshot(ctx.householdId);
  return json(view.debts);
});

export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const input = await parseBody(req, debtInputSchema);
  return json(await ctx.services.debts.create(ctx.householdId, input), { status: 201 });
});
