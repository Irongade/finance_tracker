import { settlementInputSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { household } = await ctx.services.households.snapshot(ctx.householdId);
  return json({ settlements: household.settlements });
});

/** Flow 3: record a payment between the two of you. */
export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const input = await parseBody(req, settlementInputSchema);
  return json(await ctx.services.settleUp.record(ctx.householdId, input), { status: 201 });
});
