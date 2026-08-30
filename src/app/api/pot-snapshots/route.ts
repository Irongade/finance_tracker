import { monthSnapshotSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { household } = await ctx.services.households.snapshot(ctx.householdId);
  return json({ snapshots: household.potSnapshots });
});

/** Month-end balances, one row per goal per month (upsert). */
export const PUT = handler(async (req) => {
  const ctx = await requireContext(req);
  const { month, values } = await parseBody(req, monthSnapshotSchema);
  return json(await ctx.services.snapshots.savePots(ctx.householdId, month, values));
});
