import { reorderSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

/** Drag-reorder: the ids in their new visual order become the sort values. */
export const PUT = handler(async (req) => {
  const ctx = await requireContext(req);
  const { ids } = await parseBody(req, reorderSchema);
  return json(await ctx.services.goals.reorder(ctx.householdId, ids));
});
