import { categoryCreateSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const { household } = await ctx.services.households.snapshot(ctx.householdId);
  return json({ categories: household.categories });
});

export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const input = await parseBody(req, categoryCreateSchema);
  return json(await ctx.services.categories.create(ctx.householdId, input), { status: 201 });
});
