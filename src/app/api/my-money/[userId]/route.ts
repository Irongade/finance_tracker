import { NotFoundError } from "@/server/errors";
import { handler, json, type RouteParams, requireContext } from "@/server/http";

/** Section 5.6 for one member, with the contribution table. */
export const GET = handler(async (req, { params }: RouteParams<"userId">) => {
  const ctx = await requireContext(req);
  const { userId } = await params;
  const { view } = await ctx.services.households.snapshot(ctx.householdId);
  const person = view.persons.find((p) => p.userId === userId);
  if (!person) throw new NotFoundError("member", userId);
  return json(person);
});
