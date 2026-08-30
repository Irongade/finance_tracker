import { HttpError, handler, json, requireContext } from "@/server/http";
import { parseWorkbook } from "@/server/import/workbook";

export const runtime = "nodejs";

/** Onboarding: upload the v2 workbook (multipart field "file"). */
export const POST = handler(async (req) => {
  const ctx = await requireContext(req);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Attach the .xlsx as the 'file' field");
  if (file.size > 10 * 1024 * 1024) throw new HttpError(413, "Workbook is larger than 10 MB");
  let data: ReturnType<typeof parseWorkbook>;
  try {
    data = parseWorkbook(new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    throw new HttpError(
      422,
      e instanceof Error ? `Could not read the workbook: ${e.message}` : "Could not read the workbook",
    );
  }
  return json(await ctx.services.imports.importWorkbook(ctx.householdId, data));
});
