import { handler, json, requireContext } from "@/server/http";

/** Section 3: a one-time link for the second account. The raw token is returned once. */
export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const { token, expiresAt } = await ctx.services.households.createInvite(ctx.householdId, ctx.membership.memberId);
  const base = process.env.BETTER_AUTH_URL ?? new URL(req.url).origin;
  return json({ url: `${base}/api/invites/${token}`, expiresAt }, { status: 201 });
});
