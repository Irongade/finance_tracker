import { handler, json, publicOrigin, requireContext } from "@/server/http";

/** Section 3: a one-time link for the second account. The raw token is returned once. */
export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const { token, expiresAt } = await ctx.services.households.createInvite(ctx.householdId, ctx.membership.memberId);
  return json({ url: `${publicOrigin(req)}/api/invites/${token}`, expiresAt }, { status: 201 });
});
