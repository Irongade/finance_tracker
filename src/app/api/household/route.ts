import { householdCreateSchema, householdPatchSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext, requireSession } from "@/server/http";

/** The whole household + computed view, one round trip (section 10). */
export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const snapshot = await ctx.services.households.snapshot(ctx.householdId);
  return json({ ...snapshot, currentUserId: ctx.membership.memberId });
});

/** First run: the signed-in user becomes member 1 (onboarding step 1). */
export const POST = handler(async (req) => {
  const { authUserId, services } = await requireSession(req);
  const input = await parseBody(req, householdCreateSchema);
  const membership = await services.households.create(authUserId, input);
  return json({ membership }, { status: 201 });
});

export const PATCH = handler(async (req) => {
  const ctx = await requireContext(req);
  const input = await parseBody(req, householdPatchSchema);
  return json(await ctx.services.households.updateNames(ctx.householdId, input));
});
