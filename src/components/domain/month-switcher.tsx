"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addMonths, formatMonth, parseISODate, toISODate } from "@/domain/dates";
import type { ISOMonth } from "@/domain/types";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ‹ Aug 2026 › — the label opens a month + year picker. */
export function MonthSwitcher({
  month,
  onChange,
  className,
  style = "long",
  todayMonth,
}: {
  month: ISOMonth;
  onChange: (month: ISOMonth) => void;
  className?: string;
  style?: "short" | "long";
  /** shows a "This month" shortcut in the picker */
  todayMonth?: ISOMonth;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISODate(month);
  const [year, setYear] = useState(selected.y);

  const pick = (m: ISOMonth) => {
    onChange(m);
    setOpen(false);
  };

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
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setYear(selected.y);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="min-w-[7.5rem] rounded-full px-1 text-center text-[13px] font-semibold text-navy hover:bg-row-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={`Pick a month, currently ${formatMonth(month, "long")}`}
          >
            {formatMonth(month, style)}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="center">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" aria-label="Previous year" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft />
            </Button>
            <span className="money text-[14px] font-semibold text-navy">{year}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Next year" onClick={() => setYear((y) => y + 1)}>
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((label, i) => {
              const value = toISODate(year, i + 1, 1);
              const isSelected = value === month;
              const isToday = todayMonth !== undefined && value === todayMonth;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pick(value)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-[12.5px] font-medium hover:bg-row-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    isSelected
                      ? "bg-blue text-white dark:text-paper hover:bg-blue"
                      : isToday
                        ? "text-blue"
                        : "text-ink",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {todayMonth ? (
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => pick(todayMonth)}>
              This month
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
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
