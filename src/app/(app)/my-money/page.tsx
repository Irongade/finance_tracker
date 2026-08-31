"use client";

import { ArrowRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
import { LineItem, SectionCard } from "@/components/domain/section-card";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPence, formatShare } from "@/domain/money";
import { splitMethodLabel } from "@/domain/sentences";
import { newId, useHousehold } from "@/store/household-store";

const HORIZONS = [6, 12, 24] as const;

export default function MyMoneyPage() {
  const { view, users, household, currentUserId, dispatch } = useHousehold();
  const [userId, setUserId] = useState(currentUserId);
  const person = view.persons.find((p) => p.userId === userId) ?? view.persons[0];
  const me = users.find((u) => u.id === person.userId) ?? users[0];
  const isMe = person.userId === currentUserId;
  const who = isMe ? "your" : `${me.name}'s`;
  const incomeSources = household.incomeSources.filter((s) => s.userId === person.userId);
  const personalBills = view.bills.bills.filter(
    (b) => b.bill.owner.kind === "user" && b.bill.owner.userId === person.userId,
  );
  const investments = view.investments.accounts.filter(
    (a) => a.account.owner.kind === "joint" || a.account.owner.userId === person.userId,
  );
  const debts = view.debts.debts.filter((d) => d.debt.ownerUserId === person.userId);

  return (
    <>
      <PageHeader
        title="My Money"
        description="Income, personal bills, share of joint costs, contributions and what's left. Nothing is hidden between you."
        actions={
          <Tabs value={person.userId} onValueChange={setUserId}>
            <TabsList>
              {users.map((u) => (
                <TabsTrigger key={u.id} value={u.id} className="gap-1.5">
                  <PersonBadge owner={{ kind: "user", userId: u.id }} users={users} size="xs" /> {u.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />
      <LedgerSentence size="lg" className="mb-6">
        <Figure>{formatPence(person.leftOfLeftoverPence, { style: "whole" })}</Figure> left of {who} leftover this
        month.
      </LedgerSentence>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <SectionCard
          title="Income"
          description="Monthly take-home equivalents"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                dispatch({
                  type: "upsertIncomeSource",
                  source: { id: newId("inc"), userId: person.userId, name: "New source", monthlyPence: 0 },
                })
              }
            >
              <Plus /> Add
            </Button>
          }
        >
          <ul className="flex flex-col gap-2">
            {incomeSources.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <Input
                  aria-label="Income source name"
                  value={s.name}
                  onChange={(e) => dispatch({ type: "upsertIncomeSource", source: { ...s, name: e.target.value } })}
                  className="h-8 flex-1"
                />
                <MoneyInput
                  aria-label={`${s.name} monthly amount`}
                  size="sm"
                  className="w-32"
                  valuePence={s.monthlyPence}
                  onChange={(v) => dispatch({ type: "upsertIncomeSource", source: { ...s, monthlyPence: v ?? 0 } })}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${s.name}`}
                  onClick={() => dispatch({ type: "deleteIncomeSource", id: s.id })}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <LineItem
            label="Total income"
            emphasis
            value={<MoneyText pence={person.incomePence} style="whole" className="text-[15px]" />}
          />
        </SectionCard>

        <SectionCard
          title="Personal bills"
          description="Things only they pay"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/bills">
                Edit on Bills <ArrowRight />
              </Link>
            </Button>
          }
        >
          {personalBills.length === 0 ? <p className="text-[13px] text-ink-muted">No personal bills.</p> : null}
          {personalBills.map((b) => (
            <LineItem
              key={b.bill.id}
              label={
                <span>
                  {b.bill.name} <span className="text-ink-muted">· {b.categoryName}</span>
                </span>
              }
              value={<MoneyText pence={b.bill.monthlyPence} style="whole" />}
            />
          ))}
          <LineItem
            label="Total personal bills"
            emphasis
            value={<MoneyText pence={person.personalBillsPence} style="whole" className="text-[15px]" />}
          />
        </SectionCard>

        <SectionCard
          title="Share of joint costs"
          description={`Split rule: ${splitMethodLabel(view.shares.method)}`}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/settings">
                Change <ArrowRight />
              </Link>
            </Button>
          }
        >
          <LineItem label="Share %" value={<span className="money">{formatShare(person.share)}</span>} />
          <LineItem
            label="Joint fixed bills"
            value={<MoneyText pence={person.shareOfJointBillsPence} style="whole" />}
          />
          <LineItem
            label="Joint variable spending budget"
            value={<MoneyText pence={person.shareOfVariableBudgetPence} style="whole" />}
          />
          <LineItem
            label="Total share"
            emphasis
            value={<MoneyText pence={person.shareOfJointPence} style="whole" className="text-[15px]" />}
          />
        </SectionCard>

        <SectionCard
          title="Contributions to shared goals"
          description="Edit pledges on Goals"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/goals">
                Goals <ArrowRight />
              </Link>
            </Button>
          }
        >
          {person.contributions.map((c) => (
            <LineItem key={c.goalId} label={c.goalName} value={<MoneyText pence={c.monthlyPence} style="whole" />} />
          ))}
          <LineItem
            label="Total contributions"
            emphasis
            value={<MoneyText pence={person.pledgesPence} style="whole" className="text-[15px]" />}
          />
        </SectionCard>

        <SectionCard
          title="Investment contributions"
          description="Own accounts in full; joint accounts at the split"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/investments">
                Investments <ArrowRight />
              </Link>
            </Button>
          }
        >
          {investments.length === 0 ? <p className="text-[13px] text-ink-muted">No investment accounts yet.</p> : null}
          {investments.map((a) => (
            <LineItem
              key={a.account.id}
              label={
                <span>
                  {a.account.name}
                  {a.account.owner.kind === "joint" ? (
                    <span className="text-ink-muted"> · joint, {formatShare(person.share)}</span>
                  ) : null}
                </span>
              }
              value={
                <MoneyText
                  pence={
                    a.account.owner.kind === "joint"
                      ? person.share * a.account.monthlyContributionPence
                      : a.account.monthlyContributionPence
                  }
                  style="whole"
                />
              }
            />
          ))}
          <LineItem
            label="Total investing"
            emphasis
            value={<MoneyText pence={person.investPence} style="whole" className="text-[15px]" />}
          />
        </SectionCard>

        <SectionCard
          title="Debt payments"
          description="From the Debts page"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/debts">
                Debts <ArrowRight />
              </Link>
            </Button>
          }
        >
          {debts.length === 0 ? <p className="text-[13px] text-ink-muted">No debts. Everything reads £0.</p> : null}
          {debts.map((d) => (
            <LineItem
              key={d.debt.id}
              label={d.debt.lender}
              value={<MoneyText pence={d.paymentPence} style="whole" />}
            />
          ))}
          <LineItem
            label="Total debt payments"
            emphasis
            value={<MoneyText pence={person.debtPaymentsPence} style="whole" className="text-[15px]" />}
          />
        </SectionCard>

        <SectionCard title="Monthly snapshot" description="The leftover waterfall">
          <LineItem label="Income" value={<MoneyText pence={person.incomePence} style="whole" />} />
          <LineItem
            label="less: personal bills"
            value={<MoneyText pence={-person.personalBillsPence} style="whole" />}
          />
          <LineItem
            label="less: share of joint costs"
            value={<MoneyText pence={-person.shareOfJointPence} style="whole" />}
          />
          <LineItem label="less: goal contributions" value={<MoneyText pence={-person.pledgesPence} style="whole" />} />
          <LineItem label="less: debt payments" value={<MoneyText pence={-person.debtPaymentsPence} style="whole" />} />
          <LineItem
            label="less: investment contributions"
            value={<MoneyText pence={-person.investPence} style="whole" />}
          />
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-row-hover/70 p-3">
              <p className="text-[12px] text-ink-muted">Leftover / spending money</p>
              <MoneyText pence={person.leftoverPence} style="whole" className="text-[24px] text-navy" />
            </div>
            <div className="rounded-lg bg-mint/70 p-3">
              <p className="text-[12px] text-fern">Left of the leftover</p>
              <MoneyText pence={person.leftOfLeftoverPence} style="whole" className="text-[24px] text-fern" />
            </div>
          </div>
          <LineItem
            className="mt-2"
            muted
            label="Personal variable spending logged this month"
            value={<MoneyText pence={person.spentMtdPence} />}
          />
        </SectionCard>

        <SectionCard
          title="What your money alone adds up to"
          description="Contributions only, no bonus or interest"
          flush
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11.5px] uppercase tracking-wide text-ink-muted">
                <th scope="col" className="px-5 pb-2 text-left font-medium md:px-6">
                  Goal
                </th>
                <th scope="col" className="px-3 pb-2 text-right font-medium">
                  £/mo
                </th>
                {HORIZONS.map((h) => (
                  <th key={h} scope="col" className="px-3 pb-2 text-right font-medium">
                    {h} months
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {person.contributions.map((c) => (
                <tr key={c.goalId} className="border-t border-hairline">
                  <th scope="row" className="px-5 py-1.5 text-left font-medium text-ink md:px-6">
                    {c.goalName}
                  </th>
                  <td className="px-3 py-1.5 text-right">
                    <MoneyText pence={c.monthlyPence} style="whole" />
                  </td>
                  {HORIZONS.map((h) => (
                    <td key={h} className="px-3 py-1.5 text-right">
                      <MoneyText
                        pence={c.monthlyPence * h}
                        style="whole"
                        className={c.monthlyPence === 0 ? "text-ink-muted/60" : ""}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-hairline bg-row-hover/60 font-semibold text-navy">
                <th scope="row" className="px-5 py-2 text-left md:px-6">
                  Total
                </th>
                <td className="px-3 py-2 text-right">
                  <MoneyText pence={person.pledgesPence} style="whole" />
                </td>
                {HORIZONS.map((h) => (
                  <td key={h} className="px-3 py-2 text-right">
                    <MoneyText pence={person.pledgesPence * h} style="whole" />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </SectionCard>
      </div>
    </>
  );
}
