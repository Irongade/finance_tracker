import { settingsPatchSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { household } = await ctx.services.households.snapshot(ctx.householdId);
  return json(household.settings);
});

export const PATCH = handler(async (req) => {
  const ctx = await requireContext(req);
  const patch = await parseBody(req, settingsPatchSchema);
  return json(await ctx.services.households.updateSettings(ctx.householdId, patch));
});
