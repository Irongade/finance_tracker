import { goalCreateSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { view } = await ctx.services.households.snapshot(ctx.householdId);
  return json(view.goals);
});

export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const { pledges, ...input } = await parseBody(req, goalCreateSchema);
  return json(await ctx.services.goals.create(ctx.householdId, input, pledges ?? []), { status: 201 });
});
