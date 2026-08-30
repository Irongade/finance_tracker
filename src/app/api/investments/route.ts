import { handler, json, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { view } = await ctx.services.households.snapshot(ctx.householdId);
  return json(view.investments);
});
