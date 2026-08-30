import { incomeSourceSchema } from "@/domain/schemas";
import { handler, json, parseBody, type RouteParams, requireContext } from "@/server/http";

export const PATCH = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  const input = await parseBody(req, incomeSourceSchema);
  return json(await ctx.services.incomeSources.update(ctx.householdId, id, input));
});

export const DELETE = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  return json(await ctx.services.incomeSources.delete(ctx.householdId, id));
});
