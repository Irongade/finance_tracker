import { netWorthSnapshotSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { household } = await ctx.services.households.snapshot(ctx.householdId);
  return json({ snapshots: household.netWorthSnapshots });
});

/** Appends this month's net worth; valuePence defaults to the computed figure. */
export const PUT = handler(async (req) => {
  const ctx = await requireContext(req);
  const { month, valuePence } = await parseBody(req, netWorthSnapshotSchema);
  return json(await ctx.services.snapshots.saveNetWorth(ctx.householdId, month, valuePence));
});
