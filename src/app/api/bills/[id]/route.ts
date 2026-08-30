import { z } from "zod";
import { archiveSchema, billInputSchema } from "@/domain/schemas";
import { handler, json, parseBody, type RouteParams, requireContext } from "@/server/http";

/** PATCH takes either the full bill or { archived }. */
export const PATCH = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  const body = await parseBody(req, z.union([billInputSchema, archiveSchema]));
  if ("archived" in body && !("name" in body))
    return json(await ctx.services.bills.setArchived(ctx.householdId, id, body.archived));
  return json(await ctx.services.bills.update(ctx.householdId, id, body as z.infer<typeof billInputSchema>));
});

export const DELETE = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  return json(await ctx.services.bills.delete(ctx.householdId, id));
});
