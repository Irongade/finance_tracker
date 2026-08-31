"use client";

import { Tags } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { MatrixTable } from "@/components/domain/matrix-table";
import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
import { MonthSwitcher } from "@/components/domain/month-switcher";
import { PersonBadge } from "@/components/domain/person-badge";
import { ProgressBar } from "@/components/domain/progress-bar";
import { SectionCard } from "@/components/domain/section-card";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMonth, monthOf } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import type { MatrixLens, MatrixRow, Owner } from "@/domain/types";
import { cn } from "@/lib/utils";
import { isOverBudget } from "@/server/calc";
import { useHousehold } from "@/store/household-store";

export default function BudgetsPage() {
  const { view, clock, matrix, dispatch, users } = useHousehold();
  const currentMonth = monthOf(clock.today);
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [mobileMonth, setMobileMonth] = useState(currentMonth);
  const [lensKey, setLensKey] = useState<string>("all");
  const lens: MatrixLens =
    lensKey === "all" ? "all" : lensKey === "joint" ? { kind: "joint" } : { kind: "user", userId: lensKey };
  const budgetOwner: Owner = lens === "all" || lens.kind === "joint" ? { kind: "joint" } : lens;
  const m = useMemo(() => matrix(startMonth, lens), [matrix, startMonth, lens]);
  const mobileIndex = Math.max(0, m.months.indexOf(mobileMonth));

  // in All view the budget column is a read-only sum; pick a lens to edit that lens's budgets
  const onBudgetChange =
    lensKey === "all"
      ? undefined
      : (categoryId: string, pence: number) =>
          void dispatch({ type: "updateVariableBudget", categoryId, owner: budgetOwner, monthlyPence: pence });

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Budget vs actual, 12 rolling months. Fixed budgets come from the bills tables; set variable budgets here. Red = over budget that month."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings?tab=categories">
                <Tags /> Manage categories
              </Link>
            </Button>
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-[12.5px] text-ink-muted">Start month</span>
              <MonthSwitcher month={startMonth} onChange={setStartMonth} todayMonth={currentMonth} />
            </div>
          </>
        }
      />
      <LedgerSentence className="mb-6">
        <Figure tone={view.actuals.leftInBudgetsPence >= 0 ? undefined : "negative"}>
          {formatPence(view.actuals.leftInBudgetsPence)}
        </Figure>{" "}
        left in this month's budgets.
      </LedgerSentence>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={lensKey} onValueChange={setLensKey}>
          <SelectTrigger className="h-8 w-44" aria-label="Whose budgets to show">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Whole household</SelectItem>
            <SelectItem value="joint">Joint only</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}'s
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {lensKey !== "all" ? (
          <span className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <PersonBadge owner={budgetOwner} users={users} size="xs" />
            budgets owned by this lens; actuals are what{" "}
            {lensKey === "joint" ? "the joint account" : (users.find((u) => u.id === lensKey)?.name ?? "they")} paid
          </span>
        ) : (
          <span className="text-[12px] text-ink-muted">
            Pick a lens to edit that person's (or the joint) variable budgets
          </span>
        )}
      </div>

      {/* desktop grids */}
      <div className="hidden flex-col gap-4 md:flex">
        <SectionCard
          title="Fixed bills"
          description="Budget pulled live from the bills tables. Actuals only show if you log the bill."
          flush
        >
          <MatrixTable
            caption="Fixed bills, budget vs actual"
            rows={m.fixed}
            totals={m.fixedTotals}
            months={m.months}
            currentMonth={currentMonth}
          />
        </SectionCard>
        <SectionCard title="Variable spending" description="Set your own budgets in the second column." flush>
          <MatrixTable
            caption="Variable spending, budget vs actual"
            rows={m.variable}
            totals={m.variableTotals}
            months={m.months}
            currentMonth={currentMonth}
            budgetEditable={Boolean(onBudgetChange)}
            onBudgetChange={onBudgetChange}
          />
        </SectionCard>
        <SectionCard flush>
          <MatrixTable
            caption="Total all spending"
            rows={[]}
            totals={m.grandTotals}
            months={m.months}
            currentMonth={currentMonth}
          />
        </SectionCard>
      </div>

      {/* mobile: one month at a time */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="sticky top-12 z-20 -mx-4 flex justify-center bg-paper/90 px-4 py-2 backdrop-blur">
          <MonthSwitcher month={m.months[mobileIndex] ?? mobileMonth} onChange={setMobileMonth} />
        </div>
        <MobileMatrix title="Fixed bills" rows={m.fixed} totals={m.fixedTotals} index={mobileIndex} />
        <MobileMatrix
          title="Variable spending"
          rows={m.variable}
          totals={m.variableTotals}
          index={mobileIndex}
          editable
          onBudgetChange={onBudgetChange}
        />
        <SectionCard className="bg-row-hover/40">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-semibold text-navy">
              Total all spending · {formatMonth(m.months[mobileIndex] ?? mobileMonth)}
            </span>
            <span>
              <MoneyText pence={m.grandTotals.actualsPence[mobileIndex] ?? 0} className="text-navy" />{" "}
              <span className="text-ink-muted">of {formatPence(m.grandTotals.budgetPence, { style: "whole" })}</span>
            </span>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function MobileMatrix({
  title,
  rows,
  totals,
  index,
  editable = false,
  onBudgetChange,
}: {
  title: string;
  rows: MatrixRow[];
  totals: MatrixRow;
  index: number;
  editable?: boolean;
  onBudgetChange?: (categoryId: string, pence: number) => void;
}) {
  return (
    <SectionCard title={title} flush>
      <ul className="divide-y divide-hairline">
        {rows.map((r) => {
          const actual = r.actualsPence[index] ?? 0;
          const over = isOverBudget(actual, r.budgetPence);
          return (
            <li key={r.categoryId} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="font-medium text-ink">{r.categoryName}</span>
                <span className={cn(over && "text-brick")}>
                  <MoneyText pence={actual} className={cn(over ? "text-brick" : "text-ink")} />{" "}
                  <span className="text-ink-muted">/</span>{" "}
                  {editable && onBudgetChange ? (
                    <MoneyInput
                      size="sm"
                      className="inline-block w-24 align-middle"
                      aria-label={`${r.categoryName} budget`}
                      valuePence={r.budgetPence}
                      onChange={(v) => onBudgetChange(r.categoryId, v ?? 0)}
                    />
                  ) : (
                    <MoneyText pence={r.budgetPence} style="whole" className="text-ink-muted" />
                  )}
                </span>
              </div>
              <ProgressBar
                className="mt-1.5"
                value={r.budgetPence > 0 ? actual / r.budgetPence : actual > 0 ? 1 : 0}
                tone={over ? "negative" : "blue"}
                label={`${r.categoryName} spent vs budget`}
              />
            </li>
          );
        })}
        <li className="flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold text-navy">
          <span>{totals.categoryName}</span>
          <span>
            <MoneyText pence={totals.actualsPence[index] ?? 0} />{" "}
            <span className="font-normal text-ink-muted">/ {formatPence(totals.budgetPence, { style: "whole" })}</span>
          </span>
        </li>
      </ul>
    </SectionCard>
  );
}
