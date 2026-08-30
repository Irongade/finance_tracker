import { handler, json, type RouteParams, requireContext } from "@/server/http";

/** Marks this goal as the emergency fund (section 2.3, deviation 3). */
export const POST = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  return json(await ctx.services.goals.setEmergencyFund(ctx.householdId, id));
});
