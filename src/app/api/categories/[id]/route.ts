import { categoryPatchSchema } from "@/domain/schemas";
import { handler, json, parseBody, type RouteParams, requireContext } from "@/server/http";

/** Rename, retype or archive. Deleting is blocked while in use (service rule). */
export const PATCH = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  const patch = await parseBody(req, categoryPatchSchema);
  return json(await ctx.services.categories.update(ctx.householdId, id, patch));
});

export const DELETE = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  return json(await ctx.services.categories.delete(ctx.householdId, id));
});
