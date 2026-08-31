"use client";

import { ArrowRight, BellRing, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GoalStatusChip } from "@/components/domain/chips";
import { KpiCard } from "@/components/domain/kpi-card";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { AnimatedMoney, MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
import { ProgressBar } from "@/components/domain/progress-bar";
import { LineItem, SectionCard } from "@/components/domain/section-card";
import { SettleUpDialog } from "@/components/domain/settle-up-dialog";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { daysInMonth, formatMonth, monthOf, parseISODate } from "@/domain/dates";
import { formatPence, formatPercent } from "@/domain/money";
import { monthsOfCover, settleUpSentence } from "@/domain/sentences";
import { cn } from "@/lib/utils";
import { LISA_PROPERTY_CAP_PENCE } from "@/server/calc";
import { useHousehold } from "@/store/household-store";

export default function DashboardPage() {
  const { view, users, household, clock } = useHousehold();
  const [settleOpen, setSettleOpen] = useState(false);
  const month = monthOf(clock.today);
  const { d, y, m } = parseISODate(clock.today);
  const monthEndSoon = d > daysInMonth(y, m) - 3;
  const potsMissing = !household.potSnapshots.some((s) => s.month === month);
  const investmentsMissing =
    household.investmentAccounts.some((a) => !a.archived) &&
    !household.investmentSnapshots.some((s) => s.month === month);
  const showReminder = monthEndSoon && (potsMissing || investmentsMissing);
  const [ade, p] = view.persons;
  const settle = settleUpSentence(view.settleUp, users);
  const cover = view.emergency.months;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${formatMonth(month, "long")} · everything here is calculated, nothing to edit.`}
      />

      {showReminder ? (
        <div className="fade-in mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-amber/30 bg-butter px-4 py-3 text-[13px] text-amber">
          <span className="flex items-center gap-2">
            <BellRing className="size-4" aria-hidden /> Month end is close.{" "}
            {potsMissing ? "Type this month's pot balances" : "Type this month's investment values"} so the forecast
            stays anchored.
          </span>
          <Button asChild size="sm" variant="outline" className="border-amber/40 bg-surface text-amber hover:bg-butter">
            <Link href={potsMissing ? "/pots" : "/investments"}>Enter balances</Link>
          </Button>
        </div>
      ) : null}

      <LedgerSentence size="lg" className="mb-6">
        <Figure>{formatPence(view.budget.leftoverPence, { style: "whole" })}</Figure> left this month, as budgeted.
      </LedgerSentence>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <KpiCard
          label="Household leftover"
          value={<AnimatedMoney pence={view.budget.leftoverPence} />}
          sub="After bills, budgets, pots and debts"
        />
        <KpiCard
          label="Settle-up"
          value={
            <span
              className={cn(
                "text-[20px] font-semibold leading-tight md:text-[22px]",
                view.settleUp.direction === "square" && "text-fern",
              )}
            >
              {settle}
            </span>
          }
          sub="Shared costs paid personally"
          action={
            view.settleUp.direction !== "square" ? (
              <Button size="sm" onClick={() => setSettleOpen(true)}>
                Settle up
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setSettleOpen(true)}>
                Record a payment
              </Button>
            )
          }
        />
        <KpiCard
          label="Left in the budgets"
          value={<AnimatedMoney pence={view.actuals.leftInBudgetsPence} style="exact" />}
          sub={`of ${formatPence(view.actuals.budgetTotalPence, { style: "whole" })} this month`}
        />
        <KpiCard
          label="Net worth"
          value={<AnimatedMoney pence={view.netWorth.totalPence} />}
          sub="Accounts + pots + investments − debts"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <SectionCard title="This month, as budgeted">
          <LineItem label="Household income" value={<MoneyText pence={view.budget.incomePence} style="whole" />} />
          <LineItem
            label="Fixed bills (joint + personal)"
            value={<MoneyText pence={-view.budget.fixedPence} style="whole" />}
          />
          <LineItem
            label="Variable spending budget"
            value={<MoneyText pence={-view.budget.variablePence} style="whole" />}
          />
          <LineItem
            label="Goal contributions"
            value={<MoneyText pence={-view.budget.contributionsPence} style="whole" />}
          />
          <LineItem
            label="Investment contributions"
            value={<MoneyText pence={-view.budget.investingPence} style="whole" />}
          />
          <LineItem label="Debt payments" value={<MoneyText pence={-view.budget.debtPence} style="whole" />} />
          <LineItem
            label="Household leftover"
            emphasis
            value={<MoneyText pence={view.budget.leftoverPence} style="whole" className="text-[15px]" />}
          />
          <LineItem
            label="LISA bonus earned on top (free money)"
            muted
            value={<MoneyText pence={view.budget.bonusOnTopPence} style="whole" tone="positive" signed />}
          />
        </SectionCard>

        <SectionCard title={`${users[0].name} vs ${users[1].name}, this month`} flush>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-muted">
                <th scope="col" className="px-5 pb-2 text-left font-normal md:px-6" />
                {users.map((u) => (
                  <th key={u.id} scope="col" className="px-3 pb-2 text-right font-medium">
                    <PersonBadge
                      owner={{ kind: "user", userId: u.id }}
                      users={users}
                      size="xs"
                      withName
                      className="justify-end"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Income", ade.incomePence, p.incomePence],
                  ["Personal bills", ade.personalBillsPence, p.personalBillsPence],
                  ["Share of joint costs", ade.shareOfJointPence, p.shareOfJointPence],
                  ["Goal contributions", ade.pledgesPence, p.pledgesPence],
                  ["Investment contributions", ade.investPence, p.investPence],
                  ["Debt payments", ade.debtPaymentsPence, p.debtPaymentsPence],
                ] as const
              ).map(([label, a, b]) => (
                <tr key={label} className="border-t border-hairline">
                  <th scope="row" className="px-5 py-1.5 text-left font-normal text-ink-muted md:px-6">
                    {label}
                  </th>
                  <td className="px-3 py-1.5 text-right">
                    <MoneyText pence={a} style="whole" />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <MoneyText pence={b} style="whole" />
                  </td>
                </tr>
              ))}
              <tr className="border-t border-hairline bg-row-hover/60 font-semibold text-navy">
                <th scope="row" className="px-5 py-2 text-left md:px-6">
                  Leftover
                </th>
                <td className="px-3 py-2 text-right">
                  <MoneyText pence={ade.leftoverPence} style="whole" className="text-[14px]" />
                </td>
                <td className="px-3 py-2 text-right">
                  <MoneyText pence={p.leftoverPence} style="whole" className="text-[14px]" />
                </td>
              </tr>
              <tr className="text-ink-muted">
                <th scope="row" className="px-5 py-1.5 pb-4 text-left font-normal md:px-6">
                  Left of leftover so far
                </th>
                <td className="px-3 py-1.5 pb-4 text-right">
                  <MoneyText pence={ade.leftOfLeftoverPence} style="whole" tone="muted" />
                </td>
                <td className="px-3 py-1.5 pb-4 text-right">
                  <MoneyText pence={p.leftOfLeftoverPence} style="whole" tone="muted" />
                </td>
              </tr>
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="This month, actual" description="From the transactions log">
          <LineItem label="Spending logged (excl transfers)" value={<MoneyText pence={view.actuals.spentPence} />} />
          <LineItem
            label="Total monthly budget (fixed + variable)"
            value={<MoneyText pence={view.actuals.budgetTotalPence} style="whole" />}
          />
          <LineItem
            label="Left in the budgets"
            emphasis
            value={<MoneyText pence={view.actuals.leftInBudgetsPence} tone="auto" className="text-[15px]" />}
          />
          <LineItem label="Moved into savings pots" value={<MoneyText pence={view.actuals.transfersPence} />} />
          <LineItem
            label="Bills overdue right now"
            value={
              view.actuals.overdueCount > 0 ? (
                <Link
                  href="/bills"
                  className="inline-flex items-center gap-1 rounded-full bg-blush px-2 py-0.5 text-[12px] font-semibold text-brick hover:underline"
                >
                  <TriangleAlert className="size-3" aria-hidden /> {view.actuals.overdueCount} overdue{" "}
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              ) : (
                <span className="rounded-full bg-mint px-2 py-0.5 text-[12px] font-medium text-fern">None</span>
              )
            }
          />
          <p className="mt-3 text-[12px] text-ink-muted">
            Settle-up counts shared costs paid from a personal account. Joint-account payments are already fair.
          </p>
        </SectionCard>

        <SectionCard
          title="Investments"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/investments">
                Open <ArrowRight />
              </Link>
            </Button>
          }
        >
          {view.investments.accounts.length === 0 ? (
            <p className="text-[13px] text-ink-muted">
              No investments yet. Add an account to include it in net worth and the forecast.
            </p>
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[12.5px] text-ink-muted">Total value</p>
                <MoneyText pence={view.investments.totalValuePence} className="text-[26px] text-navy" />
              </div>
              <div className="text-right">
                <p className="text-[12.5px] text-ink-muted">Gain / loss</p>
                <p>
                  <MoneyText pence={view.investments.totalGainPence} signed tone="auto" className="text-[16px]" />{" "}
                  {view.investments.totalGainPct !== null ? (
                    <span
                      className={cn(
                        "money text-[13px]",
                        view.investments.totalGainPence >= 0 ? "text-fern" : "text-brick",
                      )}
                    >
                      ({formatPercent(view.investments.totalGainPct, { signed: true })})
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Goals at a glance" className="md:col-span-2" flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="text-[11.5px] uppercase tracking-wide text-ink-muted">
                  <th scope="col" className="px-5 pb-2 text-left font-medium md:px-6">
                    Goal
                  </th>
                  <th scope="col" className="px-3 pb-2 text-right font-medium">
                    Target
                  </th>
                  <th scope="col" className="px-3 pb-2 text-right font-medium">
                    Saved
                  </th>
                  <th scope="col" className="w-[22%] px-3 pb-2 text-left font-medium">
                    Progress
                  </th>
                  <th scope="col" className="px-3 pb-2 text-right font-medium">
                    £/mo incl bonus
                  </th>
                  <th scope="col" className="px-3 pb-2 text-right font-medium">
                    Required £/mo
                  </th>
                  <th scope="col" className="px-5 pb-2 text-left font-medium md:px-6">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.goals.goals.map((g) => (
                  <tr key={g.goal.id} className="border-t border-hairline hover:bg-row-hover">
                    <th scope="row" className="px-5 py-2 text-left font-medium text-ink md:px-6">
                      <Link href="/goals" className="hover:underline">
                        {g.goal.name}
                      </Link>
                    </th>
                    <td className="px-3 py-2 text-right">
                      <MoneyText pence={g.goal.targetPence} style="whole" className="font-medium text-ink-muted" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <MoneyText pence={g.savedPence} style="whole" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={g.progress}
                          tone={g.status.kind === "on_track" ? "positive" : "blue"}
                          label={`${g.goal.name} progress`}
                        />
                        <span className="money w-9 text-right text-[12px] text-ink-muted">
                          {Math.round(g.progress * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <MoneyText pence={g.pledgeTotalPence + g.lisaBonusPence} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <MoneyText pence={g.requiredPence} />
                    </td>
                    <td className="px-5 py-2 md:px-6">
                      <GoalStatusChip status={g.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-hairline bg-row-hover/60 font-semibold text-navy">
                  <th scope="row" className="px-5 py-2 text-left md:px-6">
                    Total
                  </th>
                  <td className="px-3 py-2 text-right">
                    <MoneyText pence={view.goals.goals.reduce((s, g) => s + g.goal.targetPence, 0)} style="whole" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <MoneyText pence={view.goals.latestPotsTotalPence} style="whole" />
                  </td>
                  <td />
                  <td className="px-3 py-2 text-right">
                    <MoneyText pence={view.goals.totalPledgesPence + view.goals.totalLisaBonusPence} />
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-[12px] font-normal text-ink-muted">
                    incl. <MoneyText pence={view.goals.totalLisaBonusPence} style="whole" className="font-medium" />{" "}
                    LISA bonus
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Emergency fund check" description="Aim for 3 to 6 months of all bills">
          <p className="text-[22px] font-semibold text-navy">
            {cover === null ? "No emergency fund marked" : monthsOfCover(cover)}
            {cover !== null ? (
              <span className="text-[13px] font-normal text-ink-muted">
                {" "}
                of cover in {view.goals.goals.find((g) => g.goal.id === view.emergency.goalId)?.goal.name}
              </span>
            ) : null}
          </p>
          <div
            className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-row-hover"
            role="img"
            aria-label={`${monthsOfCover(cover)} of cover; target band 3 to 6 months`}
          >
            <div
              className="absolute inset-y-0 bg-mint"
              style={{ left: `${(3 / 8) * 100}%`, width: `${(3 / 8) * 100}%` }}
            />
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full", (cover ?? 0) >= 3 ? "bg-fern" : "bg-blue")}
              style={{ width: `${Math.min(100, ((cover ?? 0) / 8) * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
            <span>0</span>
            <span>3 months</span>
            <span>6 months</span>
            <span>8+</span>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-muted">
            <MoneyText pence={view.emergency.savedPence} style="whole" className="font-medium" /> saved against{" "}
            <MoneyText pence={view.emergency.monthlyBillsPence} style="whole" className="font-medium" /> of monthly
            bills.
          </p>
        </SectionCard>

        <SectionCard title="Forecast & house affordability">
          <LineItem
            label="All pots in 12 months"
            value={<MoneyText pence={view.affordability.pots12Pence} style="whole" />}
          />
          <LineItem
            label="All pots in 24 months"
            value={<MoneyText pence={view.affordability.pots24Pence} style="whole" />}
          />
          <LineItem
            label="House pot (both LISAs incl bonuses) in 12 months"
            value={<MoneyText pence={view.affordability.housePot12Pence} style="whole" />}
          />
          <LineItem
            label="House pot in 24 months"
            value={<MoneyText pence={view.affordability.housePot24Pence} style="whole" />}
          />
          <LineItem
            label={`Rough mortgage at ${household.settings.mortgageMultiple}× joint income`}
            value={<MoneyText pence={view.affordability.mortgagePence} style="whole" />}
          />
          <LineItem
            label="Indicative max house price in 24 months"
            emphasis
            value={<MoneyText pence={view.affordability.maxPrice24Pence} style="whole" className="text-[15px]" />}
          />
          <p className="mt-3 text-[11.5px] text-ink-muted">
            Rule of thumb, not advice. Lenders assess affordability individually. LISA-bought homes are capped at{" "}
            {formatPence(LISA_PROPERTY_CAP_PENCE, { style: "whole" })}.
          </p>
          <Button asChild variant="link" size="sm" className="mt-1 px-0">
            <Link href="/forecast">
              See the 24-month forecast <ArrowRight />
            </Link>
          </Button>
        </SectionCard>
      </div>

      <SettleUpDialog open={settleOpen} onOpenChange={setSettleOpen} />
    </>
  );
}
