"use client";

import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
import { formatMonth } from "@/domain/dates";
import type { ISOMonth, MatrixRow } from "@/domain/types";
import { cn } from "@/lib/utils";
import { isOverBudget } from "@/server/calc";

export interface MatrixTableProps {
  rows: MatrixRow[];
  totals: MatrixRow;
  months: ISOMonth[];
  /** highlight the current month column */
  currentMonth?: ISOMonth;
  budgetEditable?: boolean;
  onBudgetChange?: (categoryId: string, pence: number) => void;
  caption: string;
}

/** 12-month budget vs actual grid with a sticky first column (section 7.4). */
export function MatrixTable({
  rows,
  totals,
  months,
  currentMonth,
  budgetEditable = false,
  onBudgetChange,
  caption,
}: MatrixTableProps) {
  const cell = (actual: number, budget: number, emphasis = false) => (
    <td
      className={cn(
        "whitespace-nowrap px-3 py-2 text-right text-[12.5px] last:pr-4 md:last:pr-5",
        emphasis && "font-semibold text-navy",
        isOverBudget(actual, budget) && "bg-blush text-brick",
      )}
    >
      {actual === 0 ? (
        <span className="text-ink-muted/60">—</span>
      ) : (
        <MoneyText pence={actual} className={cn("font-medium", isOverBudget(actual, budget) && "text-brick")} />
      )}
    </td>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-hairline text-[11.5px] uppercase tracking-wide text-ink-muted">
            <th scope="col" className="sticky left-0 z-10 bg-surface px-4 py-2 font-medium md:px-5">
              Category
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Budget £/mo
            </th>
            {months.map((m) => (
              <th
                key={m}
                scope="col"
                className={cn(
                  "px-3 py-2 text-right font-medium last:pr-4 md:last:pr-5",
                  m === currentMonth && "text-blue",
                )}
              >
                {formatMonth(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.categoryId} className="border-b border-hairline hover:bg-row-hover">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface px-4 py-1.5 text-[13px] font-medium text-ink md:px-5"
              >
                {r.categoryName}
              </th>
              <td className="px-3 py-1.5 text-right">
                {budgetEditable && onBudgetChange ? (
                  <MoneyInput
                    size="sm"
                    className="ml-auto w-28"
                    aria-label={`${r.categoryName} budget`}
                    valuePence={r.budgetPence}
                    onChange={(v) => onBudgetChange(r.categoryId, v ?? 0)}
                  />
                ) : (
                  <MoneyText pence={r.budgetPence} style="whole" className="text-[12.5px] text-ink-muted" />
                )}
              </td>
              {r.actualsPence.map((a, i) => (
                <MatrixCell key={months[i]}>{cell(a, r.budgetPence)}</MatrixCell>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-row-hover/60">
            <th
              scope="row"
              className="sticky left-0 z-10 bg-row-hover px-4 py-2 text-[12.5px] font-semibold text-navy md:px-5"
            >
              {totals.categoryName}
            </th>
            <td className="px-3 py-2 text-right">
              <MoneyText pence={totals.budgetPence} style="whole" className="text-[12.5px] text-navy" />
            </td>
            {totals.actualsPence.map((a, i) => (
              <MatrixCell key={months[i]}>{cell(a, totals.budgetPence, true)}</MatrixCell>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function MatrixCell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
