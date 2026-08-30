import { handler, json, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  return json(await ctx.services.settleUp.current(ctx.householdId));
});
