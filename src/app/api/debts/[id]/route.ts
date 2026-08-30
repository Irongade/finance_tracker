import { debtInputSchema } from "@/domain/schemas";
import { handler, json, parseBody, type RouteParams, requireContext } from "@/server/http";

export const PATCH = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  const input = await parseBody(req, debtInputSchema);
  return json(await ctx.services.debts.update(ctx.householdId, id, input));
});

export const DELETE = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  return json(await ctx.services.debts.delete(ctx.householdId, id));
});
