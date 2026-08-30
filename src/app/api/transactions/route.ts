import { transactionInputSchema } from "@/domain/schemas";
import { HttpError, handler, json, parseBody, requireContext } from "@/server/http";

/** GET ?month=YYYY-MM-01 lists one month (newest first); POST logs spending (flow 1). */
export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const month = new URL(req.url).searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}-01$/.test(month)) throw new HttpError(400, "month=YYYY-MM-01 is required");
  return json({ transactions: await ctx.services.transactions.listByMonth(ctx.householdId, month) });
});

export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const input = await parseBody(req, transactionInputSchema);
  return json(await ctx.services.transactions.create(ctx.householdId, input), { status: 201 });
});
