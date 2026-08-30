import { accountSchema } from "@/domain/schemas";
import { handler, json, parseBody, type RouteParams, requireContext } from "@/server/http";

export const PATCH = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  const input = await parseBody(req, accountSchema);
  return json(await ctx.services.accounts.update(ctx.householdId, id, input));
});

export const DELETE = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  return json(await ctx.services.accounts.delete(ctx.householdId, id));
});
