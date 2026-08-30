import { billInputSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { view } = await ctx.services.households.snapshot(ctx.householdId);
  return json(view.bills);
});

export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const input = await parseBody(req, billInputSchema);
  return json(await ctx.services.bills.create(ctx.householdId, input), { status: 201 });
});
