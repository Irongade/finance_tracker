"use client";

import { ArrowRightLeft, Plus, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { WRAPPER_LABEL, WrapperChip } from "@/components/domain/chips";
import { EmptyState } from "@/components/domain/empty-state";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
import { PERSON_STYLE, PersonBadge, personKey } from "@/components/domain/person-badge";
import { useQuickAdd } from "@/components/domain/quick-add-context";
import { SectionCard } from "@/components/domain/section-card";
import { SnapshotForm } from "@/components/domain/snapshot-form";
import { TrendChart } from "@/components/domain/trend-chart";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMonth, monthOf } from "@/domain/dates";
import { formatPence, formatPercent } from "@/domain/money";
import { investmentAccountInputSchema } from "@/domain/schemas";
import type { InvestmentAccount, InvestmentWrapper, Owner } from "@/domain/types";
import { cn } from "@/lib/utils";
import { CATEGORY } from "@/mock/fixtures";
import { newId, useHousehold } from "@/mock/store";

const ISA_NOTE =
  "ISAs: £20,000/year allowance per person across cash ISAs, S&S ISAs and LISAs (LISA money counts toward it).";

export default function InvestmentsPage() {
  const { view, users, household, clock, dispatch } = useHousehold();
  const { open } = useQuickAdd();
  const [adding, setAdding] = useState(false);
  const [month, setMonth] = useState(monthOf(clock.today));
  const inv = view.investments;

  const existing = useMemo(
    () =>
      Object.fromEntries(
        household.investmentSnapshots.filter((s) => s.month === month).map((s) => [s.accountId, s.valuePence]),
      ),
    [household.investmentSnapshots, month],
  );
  const history = useMemo(() => {
    const months = [...new Set(household.investmentSnapshots.map((s) => s.month))].sort((a, b) => (a < b ? 1 : -1));
    return months.map((mo) => {
      const row = Object.fromEntries(
        household.investmentSnapshots.filter((s) => s.month === mo).map((s) => [s.accountId, s.valuePence]),
      );
      return { month: mo, row, total: Object.values(row).reduce((a, b) => a + b, 0) };
    });
  }, [household.investmentSnapshots]);

  const chartData = useMemo(
    () =>
      view.forecast.rows.map((r) => ({
        month: formatMonth(r.month),
        total: Math.round(r.investmentsTotalPence),
        ...Object.fromEntries(inv.accounts.map((a) => [a.account.id, Math.round(a.projectionPence[r.index] ?? 0)])),
      })),
    [view.forecast.rows, inv.accounts],
  );
  const palette = ["var(--workbook-blue)", "var(--ade-teal)", "var(--p-plum)", "var(--fern)", "var(--amber)"];

  const addButton = (
    <Button onClick={() => setAdding(true)}>
      <Plus /> Add account
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Investments"
        description="Account-level tracking: type a value at month end, log contributions as transfers. No price feeds, no extra routine."
        actions={inv.accounts.length ? addButton : undefined}
      />

      {inv.accounts.length === 0 ? (
        <SectionCard flush>
          <EmptyState
            icon={TrendingUp}
            title="No investments yet"
            description="Add an account to include it in net worth."
            action={addButton}
          />
          <p className="px-6 pb-5 text-center text-[11.5px] text-ink-muted">{ISA_NOTE}</p>
        </SectionCard>
      ) : (
        <>
          <LedgerSentence className="mb-6">
            <Figure>{formatPence(inv.totalValuePence, { style: "whole" })}</Figure> invested,{" "}
            <Figure tone={inv.totalGainPence >= 0 ? "positive" : "negative"}>
              {formatPence(inv.totalGainPence, { style: "whole", signed: true })}
              {inv.totalGainPct !== null ? ` (${formatPercent(inv.totalGainPct, { signed: true })})` : ""}
            </Figure>{" "}
            on what you put in.
          </LedgerSentence>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <SectionCard className="p-4" contentClassName="p-0">
              <p className="text-[12px] text-ink-muted">Value</p>
              <MoneyText pence={inv.totalValuePence} className="text-[20px] text-navy" />
            </SectionCard>
            <SectionCard className="p-4" contentClassName="p-0">
              <p className="text-[12px] text-ink-muted">Contributed</p>
              <MoneyText pence={inv.totalContributedPence} className="text-[20px] text-navy" />
            </SectionCard>
            <SectionCard className="p-4" contentClassName="p-0">
              <p className="text-[12px] text-ink-muted">Gain / loss</p>
              <MoneyText pence={inv.totalGainPence} signed tone="auto" className="text-[20px]" />
            </SectionCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {inv.accounts.map((a) => {
              const key = personKey(a.account.owner, users);
              return (
                <article
                  key={a.account.id}
                  className="fade-in flex flex-col gap-4 rounded-[10px] border border-hairline bg-surface p-5"
                >
                  <header className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[16px] font-semibold text-navy">{a.account.name}</h3>
                        <WrapperChip wrapper={a.account.wrapper} />
                      </div>
                      <p className="mt-0.5 text-[12.5px] text-ink-muted">
                        {a.account.provider || "No provider"} ·{" "}
                        {a.valueMonth ? `valued ${formatMonth(a.valueMonth)}` : "no value yet"}
                      </p>
                    </div>
                    <PersonBadge owner={a.account.owner} users={users} size="md" />
                  </header>
                  <div className="grid grid-cols-3 gap-2 text-[12.5px]">
                    <div>
                      <p className="text-ink-muted">Value</p>
                      <MoneyText pence={a.valuePence} className="text-[17px] text-navy" />
                    </div>
                    <div>
                      <p className="text-ink-muted">Contributed</p>
                      <MoneyText pence={a.contributedPence} className="text-[17px]" />
                    </div>
                    <div>
                      <p className="text-ink-muted">Gain / loss</p>
                      <p>
                        <MoneyText pence={a.gainPence} signed tone="auto" className="text-[17px]" />
                        {a.gainPct !== null ? (
                          <span
                            className={cn("money block text-[12px]", a.gainPence >= 0 ? "text-fern" : "text-brick")}
                          >
                            {formatPercent(a.gainPct, { signed: true })}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-3">
                    <div className="grid gap-1">
                      <Label htmlFor={`contrib-${a.account.id}`} className="text-[12px] text-ink-muted">
                        Monthly contribution
                      </Label>
                      <MoneyInput
                        id={`contrib-${a.account.id}`}
                        size="sm"
                        valuePence={a.account.monthlyContributionPence}
                        onChange={(v) =>
                          dispatch({
                            type: "updateInvestmentAccount",
                            account: { ...a.account, monthlyContributionPence: v ?? 0 },
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`growth-${a.account.id}`} className="text-[12px] text-ink-muted">
                        Expected growth %/yr
                      </Label>
                      <Input
                        id={`growth-${a.account.id}`}
                        type="number"
                        step={0.5}
                        min={-50}
                        max={50}
                        className="h-7 text-[13px]"
                        value={Math.round(a.account.expectedGrowth * 1000) / 10}
                        onChange={(e) =>
                          dispatch({
                            type: "updateInvestmentAccount",
                            account: {
                              ...a.account,
                              expectedGrowth: Math.max(-0.5, Math.min(0.5, Number(e.target.value) / 100)),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[12px]", PERSON_STYLE[key].text)}>
                      {a.account.owner.kind === "joint"
                        ? "Joint account, split at your rate"
                        : `${users.find((u) => u.id === (a.account.owner.kind === "user" ? a.account.owner.userId : ""))?.name}'s account`}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        open({
                          description: `${a.account.name} contribution`,
                          categoryId: CATEGORY.investmentContribution,
                          linkedInvestmentId: a.account.id,
                          amountPence: a.account.monthlyContributionPence || undefined,
                          paidBy: a.account.owner,
                          isShared: false,
                        })
                      }
                    >
                      <ArrowRightLeft /> Log contribution
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <SectionCard
            className="mt-4"
            title="24-month projection"
            description="value × (1 + growth/12) + monthly contribution, per account"
          >
            <TrendChart
              data={chartData}
              xKey="month"
              series={[
                ...inv.accounts.map((a, i) => ({
                  key: a.account.id,
                  name: a.account.name,
                  color: palette[i % palette.length],
                })),
                ...(inv.accounts.length > 1
                  ? [{ key: "total", name: "All investments", color: "var(--ledger-navy)", width: 2.5 }]
                  : []),
              ]}
            />
          </SectionCard>

          <SectionCard
            className="mt-4"
            title="Month-end values"
            description="Type the value shown by each provider. Saving overwrites that month's row."
          >
            <SnapshotForm
              month={month}
              onMonthChange={setMonth}
              noun="value"
              items={inv.accounts.map((a) => ({
                id: a.account.id,
                name: a.account.name,
                latestPence: a.valuePence,
                latestMonth: a.valueMonth,
                accent: <WrapperChip wrapper={a.account.wrapper} />,
              }))}
              existing={existing}
              onSave={(values) => {
                dispatch({ type: "saveInvestmentSnapshots", month, values });
                toast.success("Snapshot saved", { description: `${formatMonth(month, "long")} values updated.` });
              }}
            />
          </SectionCard>

          {history.length ? (
            <SectionCard className="mt-4" title="History" flush>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-[13px]">
                  <thead>
                    <tr className="text-[11.5px] uppercase tracking-wide text-ink-muted">
                      <th scope="col" className="px-5 pb-2 text-left font-medium md:px-6">
                        Month
                      </th>
                      {inv.accounts.map((a) => (
                        <th key={a.account.id} scope="col" className="px-3 pb-2 text-right font-medium">
                          {a.account.name}
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
                        {inv.accounts.map((a) => (
                          <td key={a.account.id} className="px-3 py-2 text-right">
                            {h.row[a.account.id] !== undefined ? (
                              <MoneyText pence={h.row[a.account.id]} />
                            ) : (
                              <span className="text-ink-muted/60">—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-5 py-2 text-right md:px-6">
                          <MoneyText pence={h.total} className="text-navy" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : null}
          <p className="mt-4 text-[11.5px] text-ink-muted">{ISA_NOTE}</p>
        </>
      )}

      <AccountDialog
        key={adding ? "open" : "closed"}
        open={adding}
        onOpenChange={setAdding}
        onSave={(account) => {
          dispatch({ type: "addInvestmentAccount", account });
          toast.success("Account added", { description: `${account.name}. Enter its first value below.` });
          setAdding(false);
        }}
      />
    </>
  );
}

function AccountDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (a: InvestmentAccount) => void;
}) {
  const { users } = useHousehold();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [wrapper, setWrapper] = useState<InvestmentWrapper>("ss_isa");
  const [owner, setOwner] = useState<Owner>({ kind: "user", userId: users[0].id });
  const [monthlyContributionPence, setMonthly] = useState<number | null>(0);
  const [growth, setGrowth] = useState("5");
  const [contributedBeforePence, setBefore] = useState<number | null>(0);
  const [error, setError] = useState<string | null>(null);
  const ownerOptions: Owner[] = [
    { kind: "user", userId: users[0].id },
    { kind: "user", userId: users[1].id },
    { kind: "joint" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an investment account</DialogTitle>
          <DialogDescription>One row per account, not per holding. Values are typed in at month end.</DialogDescription>
        </DialogHeader>
        <form
          id="inv-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = investmentAccountInputSchema.safeParse({
              name,
              provider,
              wrapper,
              owner,
              monthlyContributionPence: monthlyContributionPence ?? 0,
              expectedGrowth: Number(growth) / 100,
              contributedBeforePence: contributedBeforePence ?? 0,
              notes: null,
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "Check the form");
              return;
            }
            onSave({ id: newId("inv"), archived: false, ...parsed.data });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="inv-name">Name</Label>
              <Input
                id="inv-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. S&S ISA"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-provider">Provider</Label>
              <Input
                id="inv-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Vanguard"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="inv-wrapper">Wrapper</Label>
              <Select value={wrapper} onValueChange={(v) => setWrapper(v as InvestmentWrapper)}>
                <SelectTrigger id="inv-wrapper" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WRAPPER_LABEL) as InvestmentWrapper[]).map((w) => (
                    <SelectItem key={w} value={w}>
                      {WRAPPER_LABEL[w]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Owner</Label>
              <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Owner">
                {ownerOptions.map((o) => {
                  const selected =
                    o.kind === owner.kind &&
                    (o.kind === "joint" || (owner.kind === "user" && owner.userId === o.userId));
                  return (
                    <button
                      key={o.kind === "joint" ? "joint" : o.userId}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setOwner(o)}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-md border",
                        selected ? "border-blue bg-blue/8" : "border-hairline hover:bg-row-hover",
                      )}
                    >
                      <PersonBadge owner={o} users={users} size="xs" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="inv-monthly">Monthly £</Label>
              <MoneyInput id="inv-monthly" valuePence={monthlyContributionPence} onChange={setMonthly} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-growth">Growth %/yr</Label>
              <Input
                id="inv-growth"
                type="number"
                step={0.5}
                min={-50}
                max={50}
                value={growth}
                onChange={(e) => setGrowth(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-before">Put in so far £</Label>
              <MoneyInput id="inv-before" valuePence={contributedBeforePence} onChange={setBefore} />
            </div>
          </div>
          {error ? <p className="text-[12.5px] font-medium text-brick">{error}</p> : null}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="inv-form">
            Add account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
