"use client";

/**
 * Bank statement import: upload or paste a CSV, map the columns once per bank
 * (the mapping is remembered), preview with suggested categories and duplicate
 * detection, then insert everything in one atomic request. Manual entry stays
 * the norm; this is for catching up a month in one go.
 */

import { FileSpreadsheet, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatPence } from "@/domain/money";
import type { TransactionInput } from "@/domain/schemas";
import type { Household, Owner } from "@/domain/types";
import { ApiError, api } from "@/lib/api";
import { type DateFormat, detectDateFormat, parseCsv, parseCsvAmount, parseCsvDate } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { useHousehold } from "@/store/household-store";

type SignConvention = "bank" | "positive";

interface Mapping {
  dateCol: number;
  descriptionCol: number;
  amountCol: number;
  dateFormat: DateFormat;
  sign: SignConvention;
}

interface PreviewRow {
  /** stable identity for React keys, assigned once at preview build */
  key: number;
  include: boolean;
  duplicate: boolean;
  date: string;
  description: string;
  amountPence: number;
  categoryId: string;
}

const mappingKey = (headers: string[]) => `csv-mapping:${headers.join("|").toLowerCase()}`;

function guessColumn(headers: string[], patterns: RegExp[], fallback: number): number {
  for (const pattern of patterns) {
    const i = headers.findIndex((h) => pattern.test(h));
    if (i >= 0) return i;
  }
  return fallback;
}

/** Learn categories from history: whole descriptions first, then word overlap. */
function buildSuggester(household: Household, fallbackCategoryId: string) {
  const active = new Set(household.categories.filter((c) => !c.archived && c.type !== "transfer").map((c) => c.id));
  const byExact = new Map<string, string>();
  const byWord = new Map<string, Map<string, number>>();
  for (const t of household.transactions) {
    if (!active.has(t.categoryId)) continue;
    const norm = t.description.toLowerCase().trim();
    byExact.set(norm, t.categoryId);
    for (const word of norm.split(/[^a-z]+/).filter((w) => w.length >= 3)) {
      const counts = byWord.get(word) ?? new Map<string, number>();
      counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
      byWord.set(word, counts);
    }
  }
  return (description: string): string => {
    const norm = description.toLowerCase().trim();
    const exact = byExact.get(norm);
    if (exact) return exact;
    const tally = new Map<string, number>();
    for (const word of norm.split(/[^a-z]+/).filter((w) => w.length >= 3)) {
      for (const [cat, n] of byWord.get(word) ?? []) tally.set(cat, (tally.get(cat) ?? 0) + n);
    }
    let best = fallbackCategoryId;
    let bestN = 0;
    for (const [cat, n] of tally) {
      if (n > bestN) {
        best = cat;
        bestN = n;
      }
    }
    return best;
  };
}

export function CsvImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { household, users, currentUserId, dispatch } = useHousehold();
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [pasted, setPasted] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [paidBy, setPaidBy] = useState<Owner>({ kind: "user", userId: currentUserId });
  const [shared, setShared] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [busy, setBusy] = useState(false);

  const spendingCategories = useMemo(
    () => household.categories.filter((c) => !c.archived && c.type !== "transfer"),
    [household.categories],
  );
  const fallbackCategoryId = useMemo(
    () => (spendingCategories.find((c) => /misc|other/i.test(c.name)) ?? spendingCategories[0])?.id ?? "",
    [spendingCategories],
  );

  const reset = () => {
    setStep("upload");
    setPasted("");
    setHeaders([]);
    setRows([]);
    setMapping(null);
    setPreview([]);
    setSkipped(0);
  };

  const loadCsv = (text: string) => {
    const parsed = parseCsv(text);
    if (parsed.headers.length < 2 || parsed.rows.length === 0) {
      toast.error("Couldn't read that", { description: "The file needs a header row and at least one transaction." });
      return;
    }
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    let next: Mapping | null = null;
    try {
      const saved = localStorage.getItem(mappingKey(parsed.headers));
      if (saved) next = JSON.parse(saved) as Mapping;
    } catch {
      // ignore a corrupt saved mapping
    }
    if (!next) {
      const dateCol = guessColumn(parsed.headers, [/date/i], 0);
      next = {
        dateCol,
        descriptionCol: guessColumn(parsed.headers, [/desc|narrat|detail|merchant|reference|memo|name/i], 1),
        amountCol: guessColumn(parsed.headers, [/amount|value|debit/i], parsed.headers.length - 1),
        dateFormat: detectDateFormat(parsed.rows.map((r) => r[dateCol] ?? "")),
        sign: "bank",
      };
    }
    setMapping(next);
    setStep("map");
  };

  const buildPreview = () => {
    if (!mapping) return;
    const suggest = buildSuggester(household, fallbackCategoryId);
    const existing = new Set(
      household.transactions.map((t) => `${t.date}|${t.amountPence}|${t.description.toLowerCase().trim()}`),
    );
    const out: PreviewRow[] = [];
    let bad = 0;
    for (const row of rows) {
      const date = parseCsvDate(row[mapping.dateCol] ?? "", mapping.dateFormat);
      const raw = parseCsvAmount(row[mapping.amountCol] ?? "");
      const description = (row[mapping.descriptionCol] ?? "").trim();
      if (!date || raw === null || raw === 0 || !description) {
        bad++;
        continue;
      }
      // app convention: positive = spending, negative = refund
      const amountPence = mapping.sign === "bank" ? -raw : raw;
      const duplicate = existing.has(`${date}|${amountPence}|${description.toLowerCase()}`);
      out.push({
        key: out.length,
        include: !duplicate,
        duplicate,
        date,
        description,
        amountPence,
        categoryId: suggest(description),
      });
    }
    out.sort((a, b) => (a.date < b.date ? -1 : 1));
    setPreview(out);
    setSkipped(bad);
    try {
      localStorage.setItem(mappingKey(headers), JSON.stringify(mapping));
    } catch {
      // storage may be unavailable; the mapping just isn't remembered
    }
    setStep("preview");
  };

  const doImport = async () => {
    if (busy) return;
    const selected = preview.filter((r) => r.include);
    if (selected.length === 0) return;
    const transactions: TransactionInput[] = selected.map((r) => ({
      date: r.date,
      description: r.description,
      categoryId: r.categoryId,
      amountPence: r.amountPence,
      paidBy,
      isShared: shared,
      shareOverride: null,
      linkedBillId: null,
      linkedGoalId: null,
      linkedInvestmentId: null,
      notes: null,
    }));
    setBusy(true);
    try {
      const result = await api<{ result: unknown[]; household: Household }>({
        method: "POST",
        url: "/api/transactions/bulk",
        body: { transactions },
      });
      await dispatch({ type: "replace", household: result.household });
      toast.success(`Imported ${selected.length} ${selected.length === 1 ? "transaction" : "transactions"}`);
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error("Import failed", {
        description: e instanceof ApiError ? e.message : "Nothing was saved. Try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const included = preview.filter((r) => r.include);
  const totalPence = included.reduce((a, r) => a + r.amountPence, 0);

  const columnSelect = (label: string, value: number, onChange: (i: number) => void) => (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {headers.map((h, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: CSV columns are positional; the index is their identity
            <SelectItem key={`${i}-${h}`} value={String(i)}>
              {h || `Column ${i + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import a bank statement</DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Export a CSV from your banking app, then drop it here. Nothing is saved until the last step."}
            {step === "map" && "Tell it which column is which. Remembered for this bank next time."}
            {step === "preview" && "Untick anything that shouldn't come in. Duplicates are unticked already."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="grid gap-3">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-hairline bg-paper px-4 py-8 text-center text-[12.5px] text-ink-muted hover:bg-row-hover">
              <FileSpreadsheet className="size-6" aria-hidden />
              Click to choose a .csv file
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) loadCsv(await file.text());
                }}
              />
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor="csv-paste">…or paste the rows</Label>
              <Textarea
                id="csv-paste"
                rows={4}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder={"Date,Description,Amount\n30/08/2026,TESCO STORES,-82.40"}
              />
              <Button
                variant="outline"
                className="justify-self-start"
                disabled={!pasted.trim()}
                onClick={() => loadCsv(pasted)}
              >
                Use pasted rows
              </Button>
            </div>
          </div>
        ) : null}

        {step === "map" && mapping ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {columnSelect("Date column", mapping.dateCol, (i) =>
                setMapping({ ...mapping, dateCol: i, dateFormat: detectDateFormat(rows.map((r) => r[i] ?? "")) }),
              )}
              {columnSelect("Description column", mapping.descriptionCol, (i) =>
                setMapping({ ...mapping, descriptionCol: i }),
              )}
              {columnSelect("Amount column", mapping.amountCol, (i) => setMapping({ ...mapping, amountCol: i }))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Date format</Label>
                <Select
                  value={mapping.dateFormat}
                  onValueChange={(v) => setMapping({ ...mapping, dateFormat: v as DateFormat })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dmy">Day / Month / Year (UK)</SelectItem>
                    <SelectItem value="mdy">Month / Day / Year (US)</SelectItem>
                    <SelectItem value="iso">ISO (2026-08-30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Amount signs</Label>
                <Select
                  value={mapping.sign}
                  onValueChange={(v) => setMapping({ ...mapping, sign: v as SignConvention })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Spending is negative (most bank exports)</SelectItem>
                    <SelectItem value="positive">Spending is positive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Paid by</Label>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Paid by">
                  {(
                    [
                      { kind: "user", userId: users[0].id },
                      { kind: "user", userId: users[1].id },
                      { kind: "joint" },
                    ] as Owner[]
                  ).map((o) => {
                    const selected =
                      o.kind === paidBy.kind &&
                      (o.kind === "joint" || (paidBy.kind === "user" && paidBy.userId === o.userId));
                    return (
                      <button
                        key={o.kind === "joint" ? "joint" : o.userId}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setPaidBy(o);
                          if (o.kind === "joint") setShared(true);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[13px] font-medium",
                          selected ? "border-blue bg-blue/8 text-navy" : "border-hairline hover:bg-row-hover",
                        )}
                      >
                        <PersonBadge owner={o} users={users} size="xs" />{" "}
                        {o.kind === "joint" ? "Joint" : users.find((u) => u.id === o.userId)?.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-2.5">
                <Label htmlFor="csv-shared" className="text-[13px]">
                  Shared costs
                </Label>
                <Switch id="csv-shared" checked={shared} onCheckedChange={setShared} />
              </div>
            </div>
            <p className="text-[12px] text-ink-muted">
              {rows.length} rows found. Sample:{" "}
              <span className="font-medium text-ink">{rows[0]?.[mapping.dateCol]}</span> ·{" "}
              <span className="font-medium text-ink">{(rows[0]?.[mapping.descriptionCol] ?? "").slice(0, 40)}</span> ·{" "}
              <span className="font-medium text-ink">{rows[0]?.[mapping.amountCol]}</span>
            </p>
          </div>
        ) : null}

        {step === "preview" ? (
          <div className="grid gap-3">
            <div className="max-h-80 overflow-y-auto rounded-lg border border-hairline">
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-hairline text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="w-8 px-2 py-1.5" aria-label="Include" />
                    <th className="px-2 py-1.5 text-left font-medium">Date</th>
                    <th className="px-2 py-1.5 text-left font-medium">Description</th>
                    <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                    <th className="px-2 py-1.5 text-left font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={r.key} className={cn("border-b border-hairline", !r.include && "opacity-50")}>
                      <td className="px-2 py-1">
                        <Checkbox
                          checked={r.include}
                          aria-label={`Include ${r.description}`}
                          onCheckedChange={(v) =>
                            setPreview((p) => p.map((x, j) => (j === i ? { ...x, include: v === true } : x)))
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 text-ink-muted">{r.date}</td>
                      <td className="max-w-52 truncate px-2 py-1 font-medium text-ink">
                        {r.description}
                        {r.duplicate ? (
                          <span className="ml-1 rounded-full bg-butter px-1.5 text-[10.5px] text-amber">
                            already logged?
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <MoneyText pence={Math.abs(r.amountPence)} className={r.amountPence < 0 ? "text-fern" : ""} />
                      </td>
                      <td className="px-2 py-1">
                        <Select
                          value={r.categoryId}
                          onValueChange={(v) =>
                            setPreview((p) => p.map((x, j) => (j === i ? { ...x, categoryId: v } : x)))
                          }
                        >
                          <SelectTrigger className="h-6 w-36 text-[12px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {spendingCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-ink-muted">
              {included.length} of {preview.length} selected · total {formatPence(totalPence)}
              {skipped > 0 ? ` · ${skipped} unreadable ${skipped === 1 ? "row" : "rows"} skipped` : ""}
            </p>
          </div>
        ) : null}

        <DialogFooter>
          {step !== "upload" ? (
            <Button variant="ghost" disabled={busy} onClick={() => setStep(step === "preview" ? "map" : "upload")}>
              Back
            </Button>
          ) : null}
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === "map" ? <Button onClick={buildPreview}>Preview</Button> : null}
          {step === "preview" ? (
            <Button onClick={doImport} pending={busy} disabled={included.length === 0}>
              <Upload /> Import {included.length || ""}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
