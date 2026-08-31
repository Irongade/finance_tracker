/** Client-side CSV export (section 7.4 Settings). Household data never leaves the browser except by this. */
export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- parsing (bank statement import) ---------------------------------------

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

/**
 * RFC 4180-ish parser: quoted fields, embedded delimiters/newlines, doubled
 * quotes, CRLF, BOM. Delimiter is sniffed from the first line (, ; or tab).
 */
export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  const delimiter = [",", ";", "\t"].reduce(
    (best, d) => (occurrences(firstLine, d) > occurrences(firstLine, best) ? d : best),
    ",",
  );

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);

  const [headers = [], ...body] = rows;
  return { headers: headers.map((h) => h.trim()), rows: body, delimiter };
}

function occurrences(s: string, needle: string): number {
  // quoted sections don't count towards delimiter sniffing
  let n = 0;
  let inQuotes = false;
  for (const c of s) {
    if (c === '"') inQuotes = !inQuotes;
    else if (c === needle && !inQuotes) n++;
  }
  return n;
}

export type DateFormat = "iso" | "dmy" | "mdy";

/** "2026-08-30", "30/08/2026", "30-08-26", "08/30/2026" -> ISO or null. */
export function parseCsvDate(raw: string, format: DateFormat): string | null {
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (!m) return null;
  const [, a, b, yRaw] = m;
  const year = yRaw.length === 2 ? `20${yRaw}` : yRaw;
  const [day, month] = format === "mdy" ? [b, a] : [a, b];
  const d = Number(day);
  const mo = Number(month);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return `${year}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Detects dmy vs mdy vs iso by looking at every value in the column. */
export function detectDateFormat(values: string[]): DateFormat {
  if (values.some((v) => /^\d{4}-\d{2}-\d{2}/.test(v.trim()))) return "iso";
  let dmy = 0;
  let mdy = 0;
  for (const v of values) {
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}$/.exec(v.trim());
    if (!m) continue;
    if (Number(m[1]) > 12) dmy++;
    if (Number(m[2]) > 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}

/** "£1,234.56", "-12.30", "(45.00)" -> signed pence or null. */
export function parseCsvAmount(raw: string): number | null {
  let s = raw.trim().replace(/[£$€\s]/g, "");
  if (s === "") return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  // decimal separator = the rightmost of . and , ; the other is thousands
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(/,(\d{1,4})$/, ".$1");
  s = s.replace(/,/g, "");
  const m = /^(-)?(\d*)(?:\.(\d{1,4}))?$/.exec(s);
  if (!m || (m[2] === "" && !m[3])) return null;
  const pence =
    Number.parseInt(m[2] || "0", 10) * 100 +
    Math.round(Number.parseInt((m[3] ?? "").padEnd(2, "0").slice(0, 3), 10) / ((m[3] ?? "").length > 2 ? 10 : 1));
  const total = m[1] ? -pence : pence;
  return negative ? -total : total;
}
