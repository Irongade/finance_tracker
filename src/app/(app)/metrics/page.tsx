"use client";

/**
 * The past, measured — the backwards-looking counterpart to Forecast.
 * Everything is computed client-side from the household's own transactions
 * and snapshots; nothing here is stored.
 */

import { useMemo, useState } from "react";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
import { SectionCard } from "@/components/domain/section-card";
import { TrendChart } from "@/components/domain/trend-chart";
import { PageHeader } from "@/components/shell/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMonths, formatMonth, isSameMonth, monthOf } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import type { ISOMonth, Owner } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useHousehold } from "@/store/household-store";

const WINDOWS = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "24", label: "Last 24 months" },
];

function payerKey(paidBy: Owner, user1: string): "user1" | "user2" | "joint" {
  if (paidBy.kind === "joint") return "joint";
  return paidBy.userId === user1 ? "user1" : "user2";
}

export default function MetricsPage() {
  const { household, view, users, clock, categoryById } = useHousehold();
  const [windowSize, setWindowSize] = useState("12");
  const n = Number(windowSize);
  const currentMonth = monthOf(clock.today);

  const months = useMemo<ISOMonth[]>(
    () => Array.from({ length: n }, (_, i) => addMonths(currentMonth, i - (n - 1))),
    [currentMonth, n],
  );

  const stats = useMemo(() => {
    const perMonth = new Map<ISOMonth, { spent: number; transfers: number }>(
      months.map((m) => [m, { spent: 0, transfers: 0 }]),
    );
    const byCategory = new Map<string, number>();
    const byPayer = { user1: 0, user2: 0, joint: 0 };
    let total = 0;
    for (const t of household.transactions) {
      const m = months.find((mo) => isSameMonth(t.date, mo));
      if (!m) continue;
      const type = categoryById(t.categoryId)?.type ?? "variable";
      const bucket = perMonth.get(m);
      if (!bucket) continue;
      if (type === "transfer") {
        bucket.transfers += t.amountPence;
        continue;
      }
      bucket.spent += t.amountPence;
      total += t.amountPence;
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amountPence);
      byPayer[payerKey(t.paidBy, users[0].id)] += t.amountPence;
    }
    const categories = [...byCategory.entries()]
      .map(([id, pence]) => ({ id, name: categoryById(id)?.name ?? "Uncategorised", pence }))
      .filter((c) => c.pence > 0)
      .sort((a, b) => b.pence - a.pence);
    const activeMonths = [...perMonth.values()].filter((v) => v.spent !== 0).length || 1;
    return { perMonth, categories, byPayer, total, average: total / activeMonths };
  }, [household.transactions, months, categoryById, users]);

  const spendingData = useMemo(
    () =>
      months.map((m) => ({
        month: formatMonth(m),
        spent: Math.round(stats.perMonth.get(m)?.spent ?? 0),
        budget: Math.round(view.actuals.budgetTotalPence),
        saved: Math.round(stats.perMonth.get(m)?.transfers ?? 0),
      })),
    [months, stats.perMonth, view.actuals.budgetTotalPence],
  );

  const potsHistory = useMemo(() => {
    const byMonth = new Map<ISOMonth, number>();
    for (const snap of household.potSnapshots)
      byMonth.set(snap.month, (byMonth.get(snap.month) ?? 0) + snap.balancePence);
    return [...byMonth.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([m, pence]) => ({ month: formatMonth(m), pots: pence }));
  }, [household.potSnapshots]);

  const maxCategory = stats.categories[0]?.pence ?? 1;
  const payerTotal = stats.byPayer.user1 + stats.byPayer.user2 + stats.byPayer.joint || 1;

  return (
    <>
      <PageHeader
        title="Metrics"
        description="Forecast looks forward; this looks back. All of it from your own log."
        actions={
          <Select value={windowSize} onValueChange={setWindowSize}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOWS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <LedgerSentence className="mb-6">
        <Figure>{formatPence(stats.total, { style: "whole" })}</Figure> spent over the last {n} months, about{" "}
        <Figure>{formatPence(stats.average, { style: "whole" })}</Figure> a month.
      </LedgerSentence>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <SectionCard
          className="md:col-span-2"
          title="Spending by month"
          description="Fixed + variable, against today's monthly budget; transfers to pots shown separately"
        >
          <TrendChart
            height={260}
            data={spendingData}
            xKey="month"
            series={[
              { key: "spent", name: "Spent", color: "var(--workbook-blue)", width: 2.25 },
              { key: "budget", name: "Budget", color: "var(--brick)", dashed: true, width: 1.5 },
              { key: "saved", name: "Into pots", color: "var(--fern)", width: 1.5 },
            ]}
          />
        </SectionCard>

        <SectionCard title="Where it goes" description={`Spending by category, last ${n} months`}>
          {stats.categories.length === 0 ? (
            <p className="text-[13px] text-ink-muted">Nothing logged in this window yet.</p>
          ) : (
            <ul className="grid gap-2.5">
              {stats.categories.slice(0, 10).map((c) => (
                <li key={c.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate font-medium text-ink">{c.name}</span>
                    <span className="shrink-0">
                      <MoneyText pence={c.pence} style="whole" />{" "}
                      <span className="text-[11.5px] text-ink-muted">
                        {Math.round((c.pence / (stats.total || 1)) * 100)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-row-hover">
                    <div
                      className="h-full rounded-full bg-blue"
                      style={{ width: `${(c.pence / maxCategory) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Who paid" description="By the account it left, which is what settle-up cares about">
          <ul className="grid gap-3">
            {(
              [
                ["user1", { kind: "user", userId: users[0].id } as Owner, "bg-ade-teal"],
                ["user2", { kind: "user", userId: users[1].id } as Owner, "bg-p-plum"],
                ["joint", { kind: "joint" } as Owner, "bg-navy"],
              ] as const
            ).map(([key, owner, bar]) => (
              <li key={key}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
                  <PersonBadge owner={owner} users={users} size="xs" withName />
                  <span>
                    <MoneyText pence={stats.byPayer[key]} style="whole" />{" "}
                    <span className="text-[11.5px] text-ink-muted">
                      {Math.round((stats.byPayer[key] / payerTotal) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-row-hover">
                  <div
                    className={cn("h-full rounded-full", bar)}
                    style={{ width: `${(stats.byPayer[key] / payerTotal) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-ink-muted">
            Shared costs paid personally build the settle-up balance; joint-account payments are already fair.
          </p>
        </SectionCard>

        <SectionCard
          className="md:col-span-2"
          title="Pots, actually"
          description="Every month-end balance you've typed in — the lived version of the forecast"
        >
          {potsHistory.length < 2 ? (
            <p className="text-[13px] text-ink-muted">
              Enter a couple of month-end snapshots on Pots and the real trajectory shows up here.
            </p>
          ) : (
            <TrendChart
              height={220}
              data={potsHistory}
              xKey="month"
              series={[{ key: "pots", name: "All pots", color: "var(--ledger-navy)", width: 2.25 }]}
            />
          )}
        </SectionCard>
      </div>
    </>
  );
}
