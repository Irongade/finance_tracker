import { incomeSourceSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { household } = await ctx.services.households.snapshot(ctx.householdId);
  return json({ incomeSources: household.incomeSources });
});

export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const input = await parseBody(req, incomeSourceSchema);
  return json(await ctx.services.incomeSources.create(ctx.householdId, input), { status: 201 });
});
