import { handler, json, type RouteParams, requireContext } from "@/server/http";

export const DELETE = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  return json(await ctx.services.snapshots.deletePot(ctx.householdId, id));
});
