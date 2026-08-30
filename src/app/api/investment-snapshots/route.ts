import { monthSnapshotSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { household } = await ctx.services.households.snapshot(ctx.householdId);
  return json({ snapshots: household.investmentSnapshots });
});

export const PUT = handler(async (req) => {
  const ctx = await requireContext(req);
  const { month, values } = await parseBody(req, monthSnapshotSchema);
  return json(await ctx.services.snapshots.saveInvestments(ctx.householdId, month, values));
});
