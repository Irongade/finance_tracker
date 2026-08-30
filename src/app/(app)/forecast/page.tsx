"use client";

import { useMemo } from "react";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { MoneyText } from "@/components/domain/money-text";
import { SectionCard } from "@/components/domain/section-card";
import { TrendChart } from "@/components/domain/trend-chart";
import { PageHeader } from "@/components/shell/page-header";
import { formatMonth } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { cn } from "@/lib/utils";
import { useHousehold } from "@/mock/store";

const GOAL_COLOURS = [
  "var(--workbook-blue)",
  "var(--ade-teal)",
  "var(--p-plum)",
  "var(--fern)",
  "var(--amber)",
  "var(--brick)",
  "#6B7A99",
  "#B08968",
];

export default function ForecastPage() {
  const { view } = useHousehold();
  const goals = view.goals.goals;
  const hasInvestments = view.investments.accounts.length > 0;
  const rows = view.forecast.rows;
  const last = rows[rows.length - 1];

  const data = useMemo(
    () =>
      rows.map((r) => ({
        month: formatMonth(r.month),
        total: Math.round(r.goalsTotalPence),
        house: Math.round(r.housePotPence),
        investments: Math.round(r.investmentsTotalPence),
        combined: Math.round(r.combinedTotalPence),
        ...Object.fromEntries(Object.entries(r.goals).map(([id, v]) => [id, Math.round(v)])),
      })),
    [rows],
  );

  return (
    <>
      <PageHeader
        title="Forecast"
        description="24-month projection anchored to the latest balances. Includes the LISA bonus and any interest AER set per goal. Nothing to edit here."
      />
      <LedgerSentence className="mb-6">
        <Figure>{formatPence(last.goalsTotalPence, { style: "whole" })}</Figure> in pots by{" "}
        {formatMonth(last.month, "long")}
        {hasInvestments ? (
          <>
            , <Figure>{formatPence(last.combinedTotalPence, { style: "whole" })}</Figure> with investments
          </>
        ) : null}
        .
      </LedgerSentence>

      <SectionCard title="Balances over 24 months" description="House pot = both LISAs including bonuses">
        <TrendChart
          height={320}
          data={data}
          xKey="month"
          series={[
            ...goals.map((g, i) => ({
              key: g.goal.id,
              name: g.goal.name,
              color: GOAL_COLOURS[i % GOAL_COLOURS.length],
              width: 1.25,
            })),
            { key: "house", name: "House pot", color: "var(--workbook-blue)", dashed: true, width: 2.25 },
            { key: "total", name: "All pots", color: "var(--ledger-navy)", width: 2.5 },
            ...(hasInvestments
              ? [
                  { key: "investments", name: "Investments", color: "var(--ade-teal)", dashed: true, width: 2 },
                  { key: "combined", name: "Pots + investments", color: "var(--ink)", width: 2.5 },
                ]
              : []),
          ]}
        />
      </SectionCard>

      <SectionCard className="mt-4" title="Month by month" flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-[12.5px]">
            <thead>
              <tr className="text-[11.5px] uppercase tracking-wide text-ink-muted">
                <th scope="col" className="sticky left-0 z-10 bg-surface px-5 pb-2 text-left font-medium md:px-6">
                  Month
                </th>
                {goals.map((g) => (
                  <th key={g.goal.id} scope="col" className="px-3 pb-2 text-right font-medium">
                    {g.goal.name}
                  </th>
                ))}
                <th scope="col" className="px-3 pb-2 text-right font-medium text-navy">
                  Total
                </th>
                <th scope="col" className="px-3 pb-2 text-right font-medium text-blue">
                  House pot
                </th>
                {hasInvestments ? (
                  <>
                    <th scope="col" className="px-3 pb-2 text-right font-medium">
                      Investments
                    </th>
                    <th scope="col" className="px-5 pb-2 text-right font-medium md:px-6">
                      Combined
                    </th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const milestone = r.index === 0 || r.index === 12 || r.index === 24;
                return (
                  <tr
                    key={r.month}
                    className={cn(
                      "border-t border-hairline hover:bg-row-hover",
                      milestone && "bg-row-hover/50 font-semibold",
                    )}
                  >
                    <th
                      scope="row"
                      className={cn(
                        "sticky left-0 z-10 bg-surface px-5 py-1.5 text-left font-medium text-ink md:px-6",
                        milestone && "bg-row-hover/50",
                      )}
                    >
                      {formatMonth(r.month)}
                      {r.index === 0 ? (
                        <span className="ml-1 text-[10.5px] font-normal uppercase text-ink-muted">now</span>
                      ) : null}
                      {r.index === 12 || r.index === 24 ? (
                        <span className="ml-1 text-[10.5px] font-normal uppercase text-ink-muted">+{r.index}m</span>
                      ) : null}
                    </th>
                    {goals.map((g) => (
                      <td key={g.goal.id} className="px-3 py-1.5 text-right">
                        <MoneyText
                          pence={r.goals[g.goal.id] ?? 0}
                          style="whole"
                          className={milestone ? "" : "font-medium"}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right">
                      <MoneyText pence={r.goalsTotalPence} style="whole" className="text-navy" />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <MoneyText pence={r.housePotPence} style="whole" className="text-blue" />
                    </td>
                    {hasInvestments ? (
                      <>
                        <td className="px-3 py-1.5 text-right">
                          <MoneyText pence={r.investmentsTotalPence} style="whole" />
                        </td>
                        <td className="px-5 py-1.5 text-right md:px-6">
                          <MoneyText pence={r.combinedTotalPence} style="whole" className="text-navy" />
                        </td>
                      </>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
