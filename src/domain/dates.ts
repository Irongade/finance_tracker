/**
 * Date helpers on ISO strings. No Date arithmetic with local timezones:
 * a calendar date is three integers, and "today" is resolved once in
 * Europe/London (section 9).
 */

import type { ISODate, ISOMonth } from "./types";

export interface YMD {
  y: number;
  m: number; // 1..12
  d: number; // 1..31
}

export function parseISODate(iso: string): YMD {
  const [y, m, d] = iso.split("-").map((s) => Number.parseInt(s, 10));
  return { y, m, d };
}

export function toISODate(y: number, m: number, d: number): ISODate {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** "2026-08-28" -> "2026-08-01" */
export function monthOf(date: ISODate): ISOMonth {
  const { y, m } = parseISODate(date);
  return toISODate(y, m, 1);
}

export function addMonths(month: ISOMonth, n: number): ISOMonth {
  const { y, m } = parseISODate(month);
  const total = y * 12 + (m - 1) + n;
  return toISODate(Math.floor(total / 12), (total % 12) + 1, 1);
}

/** Whole months from `from` to `to` (year/month only), can be negative. */
export function monthsBetween(from: ISODate, to: ISODate): number {
  const a = parseISODate(from);
  const b = parseISODate(to);
  return (b.y - a.y) * 12 + (b.m - a.m);
}

export function addDays(date: ISODate, n: number): ISODate {
  const { y, m, d } = parseISODate(date);
  const t = Date.UTC(y, m - 1, d) + n * 86_400_000;
  const dt = new Date(t);
  return toISODate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function lastDayOfMonth(month: ISOMonth): ISODate {
  const { y, m } = parseISODate(month);
  return toISODate(y, m, daysInMonth(y, m));
}

export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isSameMonth(date: ISODate, month: ISOMonth): boolean {
  return date.slice(0, 7) === month.slice(0, 7);
}

/** Today's calendar date in Europe/London, from a real instant. */
export function todayInLondon(now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// --- formatting (en-GB) -----------------------------------------------------

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Aug 2026" or "August 2026" */
export function formatMonth(month: ISOMonth, style: "short" | "long" = "short"): string {
  const { y, m } = parseISODate(month);
  return `${(style === "short" ? MONTHS_SHORT : MONTHS_LONG)[m - 1]} ${y}`;
}

/** "28 Aug 2026" / "28 August 2026" / "28 Aug" */
export function formatDate(date: ISODate, style: "short" | "long" | "dayMonth" = "short"): string {
  const { y, m, d } = parseISODate(date);
  if (style === "dayMonth") return `${d} ${MONTHS_SHORT[m - 1]}`;
  if (style === "long") return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "Thursday 28 August" for day group headers */
export function formatDayHeading(date: ISODate, today?: ISODate): string {
  if (today && date === today) return "Today";
  if (today && date === addDays(today, -1)) return "Yesterday";
  const { y, m, d } = parseISODate(date);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${MONTHS_LONG[m - 1]}`;
}

/** "1st", "2nd", "3rd", "15th" */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
