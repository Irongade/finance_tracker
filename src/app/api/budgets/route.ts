import { monthOf } from "@/domain/dates";
import { HttpError, handler, json, requireContext } from "@/server/http";

/** GET ?start=YYYY-MM -> the 12-month matrix (section 5.9). */
export const GET = handler(async (req) => {
  const ctx = await requireContext(req);
  const start = new URL(req.url).searchParams.get("start");
  if (start && !/^\d{4}-\d{2}$/.test(start)) throw new HttpError(400, "start must be YYYY-MM");
  const startMonth = start ? `${start}-01` : monthOf(ctx.services.deps.clock().today);
  return json(await ctx.services.households.budgetMatrix(ctx.householdId, startMonth));
});
