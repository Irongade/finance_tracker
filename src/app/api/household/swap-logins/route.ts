import { handler, json, requireContext } from "@/server/http";

/** Swaps which sign-in belongs to which person (labels and data stay put). */
export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  return json(await ctx.services.households.swapLogins(ctx.householdId));
});
