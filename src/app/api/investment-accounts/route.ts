import { investmentAccountInputSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { household } = await ctx.services.households.snapshot(ctx.householdId);
  return json({ accounts: household.investmentAccounts });
});

export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const input = await parseBody(req, investmentAccountInputSchema);
  return json(await ctx.services.investments.create(ctx.householdId, input), { status: 201 });
});
