"use client";

import { formatPence, type MoneyStyle } from "@/domain/money";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

export type MoneyTone = "neutral" | "auto" | "positive" | "negative" | "muted";

export interface MoneyTextProps {
  pence: number;
  /** whole = planning figure (£2,155); exact = actual (£1,644.50). */
  style?: MoneyStyle;
  signed?: boolean;
  tone?: MoneyTone;
  className?: string;
}

export function toneClass(tone: MoneyTone, pence: number): string {
  if (tone === "auto") return pence > 0 ? "text-fern" : pence < 0 ? "text-brick" : "";
  if (tone === "positive") return "text-fern";
  if (tone === "negative") return "text-brick";
  if (tone === "muted") return "text-ink-muted";
  return "";
}

/** Every money figure in the app passes through here (section 7.6). */
export function MoneyText({ pence, style = "exact", signed = false, tone = "neutral", className }: MoneyTextProps) {
  return (
    <span className={cn("money", toneClass(tone, pence), className)}>{formatPence(pence, { style, signed })}</span>
  );
}

/** Dashboard KPI variant: counts up once on load. */
export function AnimatedMoney({ pence, style = "whole", signed = false, tone = "neutral", className }: MoneyTextProps) {
  const shown = useCountUp(pence);
  return (
    <span className={cn("money", toneClass(tone, pence), className)}>
      <span aria-hidden>{formatPence(shown, { style, signed })}</span>
      <span className="sr-only">{formatPence(pence, { style, signed })}</span>
    </span>
  );
}
