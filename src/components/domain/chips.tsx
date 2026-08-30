import type { ReactNode } from "react";
import { formatPence } from "@/domain/money";
import type { BillStatus, CategoryType, GoalStatus, InvestmentWrapper } from "@/domain/types";
import { cn } from "@/lib/utils";

export type ChipTone = "positive" | "negative" | "warning" | "neutral" | "info" | "ade" | "p" | "joint" | "outline";

const TONE: Record<ChipTone, string> = {
  positive: "bg-mint text-fern",
  negative: "bg-blush text-brick",
  warning: "bg-butter text-amber",
  neutral: "bg-row-hover text-ink-muted",
  info: "bg-blue/10 text-navy",
  ade: "bg-ade-teal/12 text-ade-ink",
  p: "bg-p-plum/12 text-p-ink",
  joint: "bg-navy/8 text-navy",
  outline: "border border-hairline text-ink-muted",
};

export function Chip({
  tone = "neutral",
  children,
  className,
  title,
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium leading-none whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Statuses reuse the workbook's exact vocabulary: Paid, Due, OVERDUE. */
export function BillStatusChip({ status, className }: { status: BillStatus; className?: string }) {
  if (status === "paid")
    return (
      <Chip tone="positive" className={className}>
        Paid
      </Chip>
    );
  if (status === "due")
    return (
      <Chip tone="warning" className={className}>
        Due
      </Chip>
    );
  if (status === "overdue")
    return (
      <Chip tone="negative" className={cn("font-semibold tracking-wide", className)}>
        OVERDUE
      </Chip>
    );
  return (
    <Chip tone="outline" className={className}>
      No due date
    </Chip>
  );
}

/** "On track (+£58)" / "Behind by £58" */
export function GoalStatusChip({ status, className }: { status: GoalStatus; className?: string }) {
  const amount = formatPence(status.deltaPence, { style: "whole" });
  return status.kind === "on_track" ? (
    <Chip tone="positive" className={className}>
      On track (+{amount})
    </Chip>
  ) : (
    <Chip tone="negative" className={className}>
      Behind by {amount}
    </Chip>
  );
}

export function TypeChip({ type, className }: { type: CategoryType; className?: string }) {
  const label = type === "fixed" ? "Fixed" : type === "variable" ? "Variable" : "Transfer";
  return (
    <Chip tone={type === "transfer" ? "outline" : type === "fixed" ? "neutral" : "info"} className={className}>
      {label}
    </Chip>
  );
}

export const WRAPPER_LABEL: Record<InvestmentWrapper, string> = {
  ss_isa: "S&S ISA",
  pension: "Pension",
  gia: "GIA",
  crypto: "Crypto",
  other: "Other",
};

export function WrapperChip({ wrapper, className }: { wrapper: InvestmentWrapper; className?: string }) {
  return (
    <Chip tone="info" className={className}>
      {WRAPPER_LABEL[wrapper]}
    </Chip>
  );
}

export function CategoryChip({ name, className }: { name: string; className?: string }) {
  return (
    <Chip tone="neutral" className={className}>
      {name}
    </Chip>
  );
}
