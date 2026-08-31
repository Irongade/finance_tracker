import { z } from "zod";
import { sendEmail } from "@/server/email/send";
import { handler, json, parseBody, publicOrigin, requireContext } from "@/server/http";

const bodySchema = z
  .object({ email: z.string().trim().email("That doesn't look like an email").optional() })
  .optional();

/** Section 3: a one-time link for the second account. The raw token is returned once; with an email it is also sent. */
export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const body = req.headers.get("content-type")?.includes("json") ? await parseBody(req, bodySchema) : undefined;
  const { token, expiresAt } = await ctx.services.households.createInvite(ctx.householdId, ctx.membership.memberId);
  const url = `${publicOrigin(req)}/api/invites/${token}`;
  let emailed = false;
  if (body?.email) {
    const { household } = await ctx.services.households.snapshot(ctx.householdId);
    const result = await sendEmail({
      to: body.email,
      subject: `${household.users[0].name} invited you to ${household.name}`,
      text: `${household.users[0].name} set up your shared household ledger and saved you a seat as ${household.users[1].name}.\n\nJoin here (works once, expires in 48 hours):\n${url}\n\nYou'll pick your own password; you both see the same data live.`,
    });
    emailed = result.delivered;
  }
  return json({ url, expiresAt, emailed }, { status: 201 });
});
