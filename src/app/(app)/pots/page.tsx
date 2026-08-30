"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { MoneyText } from "@/components/domain/money-text";
import { SectionCard } from "@/components/domain/section-card";
import { SnapshotForm } from "@/components/domain/snapshot-form";
import { PageHeader } from "@/components/shell/page-header";
import { formatMonth, monthOf } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { useHousehold } from "@/store/household-store";

export default function PotsPage() {
  const { view, household, clock, dispatch } = useHousehold();
  const [month, setMonth] = useState(monthOf(clock.today));
  const goals = view.goals.goals;

  const existing = useMemo(
    () =>
      Object.fromEntries(
        household.potSnapshots.filter((s) => s.month === month).map((s) => [s.goalId, s.balancePence]),
      ),
    [household.potSnapshots, month],
  );

  const history = useMemo(() => {
    const months = [...new Set(household.potSnapshots.map((s) => s.month))].sort((a, b) => (a < b ? 1 : -1));
    return months.map((mo) => {
      const row = Object.fromEntries(
        household.potSnapshots.filter((s) => s.month === mo).map((s) => [s.goalId, s.balancePence]),
      );
      return { month: mo, row, total: Object.values(row).reduce((a, b) => a + b, 0) };
    });
  }, [household.potSnapshots]);

  return (
    <>
      <PageHeader
        title="Pots"
        description="Month end: type each pot's actual balance from your banking apps. The latest row anchors Saved so far and the forecast. About five minutes a month."
      />
      <LedgerSentence className="mb-6">
        <Figure>{formatPence(view.goals.latestPotsTotalPence, { style: "whole" })}</Figure> across {goals.length} pots
        at the latest count.
      </LedgerSentence>

      <div className="flex flex-col gap-4">
        <SectionCard title="Latest" description="One balance per pot, from whichever month was entered last" flush>
          <div className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-3 lg:grid-cols-7">
            {goals.map((g) => (
              <div key={g.goal.id} className="bg-surface px-4 py-3">
                <p className="truncate text-[12px] text-ink-muted">{g.goal.name}</p>
                <MoneyText pence={g.savedPence} style="whole" className="text-[17px] text-navy" />
                <p className="text-[11px] text-ink-muted">
                  {g.savedMonth ? formatMonth(g.savedMonth) : "not yet entered"}
                </p>
              </div>
            ))}
            <div className="bg-row-hover/60 px-4 py-3">
              <p className="text-[12px] font-medium text-navy">Total</p>
              <MoneyText pence={view.goals.latestPotsTotalPence} style="whole" className="text-[17px] text-navy" />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Month-end balances"
          description="Type what the bank says. Saving overwrites that month's row."
        >
          <SnapshotForm
            month={month}
            onMonthChange={setMonth}
            noun="balance"
            items={goals.map((g) => ({
              id: g.goal.id,
              name: g.goal.name,
              latestPence: g.savedPence,
              latestMonth: g.savedMonth,
            }))}
            existing={existing}
            onSave={(values) => {
              dispatch({ type: "savePotSnapshots", month, balances: values });
              toast.success("Snapshot saved", { description: `${formatMonth(month, "long")} balances updated.` });
            }}
          />
        </SectionCard>

        <SectionCard title="History" description="One row per month end" flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="text-[11.5px] uppercase tracking-wide text-ink-muted">
                  <th scope="col" className="px-5 pb-2 text-left font-medium md:px-6">
                    Month
                  </th>
                  {goals.map((g) => (
                    <th key={g.goal.id} scope="col" className="px-3 pb-2 text-right font-medium">
                      {g.goal.name}
                    </th>
                  ))}
                  <th scope="col" className="px-5 pb-2 text-right font-medium md:px-6">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.month} className="border-t border-hairline hover:bg-row-hover">
                    <th scope="row" className="px-5 py-2 text-left font-medium text-ink md:px-6">
                      {formatMonth(h.month)}
                    </th>
                    {goals.map((g) => (
                      <td key={g.goal.id} className="px-3 py-2 text-right">
                        {h.row[g.goal.id] !== undefined ? (
                          <MoneyText pence={h.row[g.goal.id]} style="whole" />
                        ) : (
                          <span className="text-ink-muted/60">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-5 py-2 text-right md:px-6">
                      <MoneyText pence={h.total} style="whole" className="text-navy" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
