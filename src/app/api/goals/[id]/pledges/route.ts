import { pledgeInputSchema } from "@/domain/schemas";
import { handler, json, parseBody, type RouteParams, requireContext } from "@/server/http";

/** PUT one member's monthly pledge on the goal. */
export const PUT = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  const { userId, monthlyPence } = await parseBody(req, pledgeInputSchema);
  return json(await ctx.services.goals.setPledge(ctx.householdId, id, userId, monthlyPence));
});
