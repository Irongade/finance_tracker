/**
 * Money helpers. Everything is integer pence in and out; formatting is en-GB.
 * Planning figures display as whole pounds, actuals as £0.00 (section 5).
 */

const whole = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const exact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type MoneyStyle = "whole" | "exact";

export interface FormatMoneyOptions {
  /** whole = planning figure (£2,155); exact = actual (£1,644.50). Default exact. */
  style?: MoneyStyle;
  /** prefix a + on positive amounts (gains, "On track (+£58)") */
  signed?: boolean;
}

export function formatPence(pence: number, opts: FormatMoneyOptions = {}): string {
  const style = opts.style ?? "exact";
  const pounds = pence / 100;
  const rounded = style === "whole" ? Math.round(pounds) : Math.round(pounds * 100) / 100;
  const text = (style === "whole" ? whole : exact).format(Math.abs(rounded));
  if (rounded < 0) return `-${text}`;
  if (opts.signed && rounded > 0) return `+${text}`;
  return text;
}

/** Whole-pound rounding of a pence amount, as an integer number of pounds. */
export function roundToPounds(pence: number): number {
  return Math.round(pence / 100);
}

/** Round a fractional pence amount to a whole penny. */
export function roundPence(pence: number): number {
  return Math.round(pence);
}

/**
 * Parse user input like "12", "12.5", "1,200.34", "-3" into pence without
 * touching floating point. Returns null when the input is not a number.
 */
export function parsePounds(input: string | number): number | null {
  const raw = String(input)
    .trim()
    .replace(/[£,\s]/g, "");
  if (raw === "" || raw === "-" || raw === ".") return null;
  const match = /^(-)?(\d*)(?:\.(\d{0,2})\d*)?$/.exec(raw);
  if (!match) return null;
  const [, sign, intPart = "", fracPart = ""] = match;
  if (intPart === "" && fracPart === "") return null;
  const pounds = Number.parseInt(intPart || "0", 10);
  const pence = Number.parseInt(fracPart.padEnd(2, "0"), 10);
  const total = pounds * 100 + pence;
  return sign ? -total : total;
}

/** Pence -> "12.34" for populating inputs. */
export function penceToInput(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "";
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(Math.round(pence));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const pct = new Intl.NumberFormat("en-GB", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 0.567 -> "56.7%" */
export function formatPercent(ratio: number, opts: { signed?: boolean } = {}): string {
  const text = pct.format(Math.abs(ratio));
  if (ratio < 0) return `-${text}`;
  if (opts.signed && ratio > 0) return `+${text}`;
  return text;
}

/** 0.5 -> "50%" (no decimals when whole, else one) */
export function formatShare(ratio: number): string {
  const p = ratio * 100;
  return Number.isInteger(Math.round(p * 10) / 10) ? `${Math.round(p)}%` : `${p.toFixed(1)}%`;
}

export function sumPence(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
