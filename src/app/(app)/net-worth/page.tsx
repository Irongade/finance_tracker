"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
import { LineItem, SectionCard } from "@/components/domain/section-card";
import { TrendChart } from "@/components/domain/trend-chart";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMonth, monthOf } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import type { Owner } from "@/domain/types";
import { newId, useHousehold } from "@/store/household-store";

export default function NetWorthPage() {
  const { view, users, household, clock, dispatch } = useHousehold();
  const nw = view.netWorth;
  const month = monthOf(clock.today);
  const history = useMemo(
    () => [...household.netWorthSnapshots].sort((a, b) => (a.month < b.month ? -1 : 1)),
    [household.netWorthSnapshots],
  );
  const ownerValue = (o: Owner) => (o.kind === "joint" ? "joint" : o.userId);
  const parseOwner = (v: string): Owner => (v === "joint" ? { kind: "joint" } : { kind: "user", userId: v });

  return (
    <>
      <PageHeader
        title="Net Worth"
        description="Everyday accounts (money not in a goal pot) + pots + investments − debts."
        actions={
          <Button
            onClick={() => {
              dispatch({ type: "saveNetWorthSnapshot", month, valuePence: nw.totalPence });
              toast.success("Snapshot saved", {
                description: `${formatMonth(month, "long")}: ${formatPence(nw.totalPence, { style: "whole" })}`,
              });
            }}
          >
            Save snapshot
          </Button>
        }
      />
      <LedgerSentence size="lg" className="mb-6">
        <Figure>{formatPence(nw.totalPence, { style: "whole" })}</Figure> household net worth.
      </LedgerSentence>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard
          title="Everyday accounts"
          description="Update alongside the pot balances"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                dispatch({
                  type: "addAccount",
                  account: { id: newId("acc"), name: "New account", owner: { kind: "joint" }, balancePence: 0 },
                })
              }
            >
              <Plus /> Add
            </Button>
          }
        >
          <ul className="flex flex-col gap-2">
            {household.accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <Input
                  aria-label="Account name"
                  value={a.name}
                  onChange={(e) => dispatch({ type: "updateAccount", account: { ...a, name: e.target.value } })}
                  className="h-8 min-w-0 flex-1"
                />
                <Select
                  value={ownerValue(a.owner)}
                  onValueChange={(v) => dispatch({ type: "updateAccount", account: { ...a, owner: parseOwner(v) } })}
                >
                  <SelectTrigger aria-label="Owner" className="h-8 w-[5.5rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <PersonBadge owner={{ kind: "user", userId: u.id }} users={users} size="xs" /> {u.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="joint">
                      <PersonBadge owner={{ kind: "joint" }} users={users} size="xs" /> Joint
                    </SelectItem>
                  </SelectContent>
                </Select>
                <MoneyInput
                  aria-label={`${a.name} balance`}
                  size="sm"
                  className="w-32"
                  valuePence={a.balancePence}
                  allowNegative
                  onChange={(v) => dispatch({ type: "updateAccount", account: { ...a, balancePence: v ?? 0 } })}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => dispatch({ type: "deleteAccount", id: a.id })}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <LineItem
            label="Total everyday"
            emphasis
            value={<MoneyText pence={nw.accountsPence} style="whole" className="text-[15px]" />}
          />
        </SectionCard>

        <SectionCard title="Household net worth" description="Calculated">
          <LineItem label="Everyday accounts" value={<MoneyText pence={nw.accountsPence} style="whole" />} />
          <LineItem
            label={
              <Link href="/pots" className="hover:underline">
                Goal pots (latest)
              </Link>
            }
            value={<MoneyText pence={nw.potsPence} style="whole" />}
          />
          <LineItem
            label={
              <Link href="/investments" className="hover:underline">
                Investments (latest)
              </Link>
            }
            value={<MoneyText pence={nw.investmentsPence} style="whole" />}
          />
          <LineItem
            label={
              <Link href="/debts" className="hover:underline">
                less: debts
              </Link>
            }
            value={<MoneyText pence={-nw.debtsPence} style="whole" />}
          />
          <LineItem
            label="HOUSEHOLD NET WORTH"
            emphasis
            value={<MoneyText pence={nw.totalPence} style="whole" className="text-[18px]" />}
          />
        </SectionCard>

        <SectionCard className="md:col-span-2" title="History" description="Saved at each month end">
          {history.length === 0 ? (
            <p className="text-[13px] text-ink-muted">
              No snapshots yet. Save one at month end to start the trend line.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_260px]">
              <TrendChart
                height={200}
                showLegend={false}
                data={history.map((h) => ({ month: formatMonth(h.month), value: h.valuePence }))}
                xKey="month"
                series={[{ key: "value", name: "Net worth", color: "var(--ledger-navy)", width: 2.25 }]}
              />
              <ul className="divide-y divide-hairline text-[13px]">
                {[...history].reverse().map((h) => (
                  <li key={h.id} className="flex items-center justify-between py-1.5">
                    <span className="text-ink-muted">{formatMonth(h.month)}</span>
                    <MoneyText pence={h.valuePence} style="whole" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
