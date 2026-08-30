"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
import { MonthSwitcher } from "@/components/domain/month-switcher";
import { Button } from "@/components/ui/button";
import { formatMonth } from "@/domain/dates";
import type { ISOMonth } from "@/domain/types";

export interface SnapshotItem {
  id: string;
  name: string;
  latestPence: number;
  latestMonth: ISOMonth | null;
  accent?: ReactNode;
}

export interface SnapshotFormProps {
  month: ISOMonth;
  onMonthChange: (m: ISOMonth) => void;
  items: SnapshotItem[];
  /** values already saved for `month`, by item id */
  existing: Record<string, number>;
  onSave: (values: Record<string, number>) => void;
  noun: "balance" | "value";
}

/**
 * Month-end entry form shared by Pots and Investments (section 7.6). One input
 * per item; saving writes the month row (upsert).
 */
export function SnapshotForm({ month, onMonthChange, items, existing, onSave, noun }: SnapshotFormProps) {
  const [values, setValues] = useState<Record<string, number | null>>({});

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the form when the month or saved values change
  useEffect(() => {
    setValues(Object.fromEntries(items.map((i) => [i.id, existing[i.id] ?? null])));
  }, [month, existing]);

  const filled = useMemo(() => Object.values(values).filter((v) => v !== null).length, [values]);
  const total = useMemo(() => Object.values(values).reduce<number>((acc, v) => acc + (v ?? 0), 0), [values]);
  const hasSaved = Object.keys(existing).length > 0;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const out: Record<string, number> = {};
        for (const [id, v] of Object.entries(values)) if (v !== null) out[id] = v;
        onSave(out);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher month={month} onChange={onMonthChange} />
        <p className="text-[12.5px] text-ink-muted">
          {hasSaved
            ? `Saved for ${formatMonth(month)} · editing overwrites`
            : `Nothing saved for ${formatMonth(month)} yet`}
        </p>
      </div>
      <ul className="divide-y divide-hairline rounded-[10px] border border-hairline">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
                {item.accent}
                {item.name}
              </p>
              <p className="text-[12px] text-ink-muted">
                {item.latestMonth ? (
                  <>
                    Latest <MoneyText pence={item.latestPence} style="whole" className="font-medium text-ink-muted" /> (
                    {formatMonth(item.latestMonth)})
                  </>
                ) : (
                  `No ${noun} yet`
                )}
              </p>
            </div>
            <MoneyInput
              aria-label={`${item.name} ${noun} for ${formatMonth(month)}`}
              valuePence={values[item.id] ?? null}
              onChange={(v) => setValues((s) => ({ ...s, [item.id]: v }))}
              placeholder={item.latestMonth ? (item.latestPence / 100).toFixed(2) : "0.00"}
              className="w-36"
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">
          Total entered: <MoneyText pence={total} style="whole" className="text-navy" />
        </p>
        <Button type="submit" disabled={filled === 0}>
          Save snapshot
        </Button>
      </div>
    </form>
  );
}
