import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The signature (section 7.2): the ledger speaks in sentences. Fraunces, with
 * the number inline. At most one per screen.
 */
export function LedgerSentence({
  children,
  className,
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <p
      className={cn(
        "display text-balance text-navy",
        size === "lg" ? "text-[28px] leading-[1.15] md:text-[32px]" : "text-[21px] leading-[1.2] md:text-[24px]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** A figure inside a sentence keeps the display face but lines up its digits. */
export function Figure({
  children,
  tone,
  className,
}: {
  children: ReactNode;
  tone?: "positive" | "negative";
  className?: string;
}) {
  return (
    <span
      className={cn("tabular-nums", tone === "positive" && "text-fern", tone === "negative" && "text-brick", className)}
    >
      {children}
    </span>
  );
}
