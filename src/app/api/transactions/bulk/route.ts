import { transactionBulkSchema } from "@/domain/schemas";
import { handler, json, parseBody, requireContext } from "@/server/http";

/** Bank CSV import: validated rows inserted atomically; returns the fresh household. */
export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const { transactions } = await parseBody(req, transactionBulkSchema);
  return json(await ctx.services.transactions.createMany(ctx.householdId, transactions), { status: 201 });
});
