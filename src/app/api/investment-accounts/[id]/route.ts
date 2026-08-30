import { investmentAccountPatchSchema } from "@/domain/schemas";
import { handler, json, parseBody, type RouteParams, requireContext } from "@/server/http";

export const PATCH = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  const patch = await parseBody(req, investmentAccountPatchSchema);
  return json(await ctx.services.investments.update(ctx.householdId, id, patch));
});

export const DELETE = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  return json(await ctx.services.investments.delete(ctx.householdId, id));
});
