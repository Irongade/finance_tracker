"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMonths, formatMonth } from "@/domain/dates";
import type { ISOMonth } from "@/domain/types";
import { cn } from "@/lib/utils";

export function MonthSwitcher({
  month,
  onChange,
  className,
  style = "long",
}: {
  month: ISOMonth;
  onChange: (month: ISOMonth) => void;
  className?: string;
  style?: "short" | "long";
}) {
  return (
    <div
      className={cn("inline-flex items-center gap-1 rounded-full border border-hairline bg-surface p-0.5", className)}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full"
        aria-label="Previous month"
        onClick={() => onChange(addMonths(month, -1))}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-[7.5rem] text-center text-[13px] font-semibold text-navy">
        {formatMonth(month, style)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full"
        aria-label="Next month"
        onClick={() => onChange(addMonths(month, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
