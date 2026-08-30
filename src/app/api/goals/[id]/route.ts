import { z } from "zod";
import { archiveSchema, goalInputSchema } from "@/domain/schemas";
import { handler, json, parseBody, type RouteParams, requireContext } from "@/server/http";

export const PATCH = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  const body = await parseBody(req, z.union([goalInputSchema, archiveSchema]));
  if ("archived" in body && !("name" in body))
    return json(await ctx.services.goals.setArchived(ctx.householdId, id, body.archived));
  return json(await ctx.services.goals.update(ctx.householdId, id, body as z.infer<typeof goalInputSchema>));
});

export const DELETE = handler(async (req, { params }: RouteParams<"id">) => {
  const ctx = await requireContext(req);
  const { id } = await params;
  return json(await ctx.services.goals.delete(ctx.householdId, id));
});
