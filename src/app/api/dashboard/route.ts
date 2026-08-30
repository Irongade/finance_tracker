import { handler, json, requireContext } from "@/server/http";

/** Everything in sections 5.3, 5.7, 5.8, 5.13, 5.14 plus goals, investments and affordability. */
export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { view } = await ctx.services.households.snapshot(ctx.householdId);
  return json(view);
});
