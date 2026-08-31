"use client";

import { FilterX, Plus, ReceiptText, SlidersHorizontal, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/domain/confirm-dialog";
import { CsvImportDialog } from "@/components/domain/csv-import-dialog";
import { EmptyState } from "@/components/domain/empty-state";
import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
import { MonthSwitcher } from "@/components/domain/month-switcher";
import { useQuickAdd } from "@/components/domain/quick-add-context";
import { SectionCard } from "@/components/domain/section-card";
import { TransactionRow } from "@/components/domain/transaction-row";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDayHeading, formatMonth, isSameMonth, monthOf } from "@/domain/dates";
import type { Transaction } from "@/domain/types";
import { transactionType } from "@/server/calc";
import { useHousehold } from "@/store/household-store";

const ALL = "all";
type SortBy = "newest" | "highest" | "lowest";

export default function TransactionsPage() {
  const { household, users, clock, dispatch, categoryById } = useHousehold();
  const { open } = useQuickAdd();
  const todayMonth = monthOf(clock.today);
  const [month, setMonth] = useState(todayMonth);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // filters (section: person / joint, category, amount)
  const [person, setPerson] = useState<string>(ALL); // all | joint | member id
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [minPence, setMinPence] = useState<number | null>(null);
  const [maxPence, setMaxPence] = useState<number | null>(null);

  const rangeActive = minPence !== null || maxPence !== null;
  const filtersActive = person !== ALL || categoryId !== ALL || rangeActive;

  const clearFilters = () => {
    setPerson(ALL);
    setCategoryId(ALL);
    setMinPence(null);
    setMaxPence(null);
  };

  const types = useMemo(() => new Map(household.categories.map((c) => [c.id, c.type])), [household.categories]);
  const activeCategories = useMemo(
    () => household.categories.filter((c) => !c.archived).sort((a, b) => a.sort - b.sort),
    [household.categories],
  );

  const inMonth = useMemo(
    () =>
      household.transactions
        .filter((t) => isSameMonth(t.date, month))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1)),
    [household.transactions, month],
  );

  const filtered = useMemo(
    () =>
      inMonth.filter((t) => {
        if (person === "joint" && t.paidBy.kind !== "joint") return false;
        if (person !== ALL && person !== "joint" && !(t.paidBy.kind === "user" && t.paidBy.userId === person))
          return false;
        if (categoryId !== ALL && t.categoryId !== categoryId) return false;
        const abs = Math.abs(t.amountPence);
        if (minPence !== null && abs < minPence) return false;
        if (maxPence !== null && abs > maxPence) return false;
        return true;
      }),
    [inMonth, person, categoryId, minPence, maxPence],
  );

  const display = useMemo(() => {
    if (sortBy === "newest") return filtered;
    return [...filtered].sort((a, b) =>
      sortBy === "highest"
        ? Math.abs(b.amountPence) - Math.abs(a.amountPence)
        : Math.abs(a.amountPence) - Math.abs(b.amountPence),
    );
  }, [filtered, sortBy]);

  const byDay = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const t of display) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);
    return [...groups.entries()];
  }, [display]);

  const totals = useMemo(() => {
    let spent = 0;
    let transfers = 0;
    for (const t of filtered) {
      if (transactionType(t, types) === "transfer") transfers += t.amountPence;
      else spent += t.amountPence;
    }
    return { spent, transfers };
  }, [filtered, types]);

  const linkedLabel = (t: Transaction): string | null => {
    if (t.linkedBillId) return household.bills.find((b) => b.id === t.linkedBillId)?.name ?? null;
    if (t.linkedGoalId) return household.goals.find((g) => g.id === t.linkedGoalId)?.name ?? null;
    if (t.linkedInvestmentId)
      return household.investmentAccounts.find((a) => a.id === t.linkedInvestmentId)?.name ?? null;
    return null;
  };

  const row = (t: Transaction) => {
    const cat = categoryById(t.categoryId);
    return (
      <TransactionRow
        key={t.id}
        txn={t}
        users={users}
        categoryName={cat?.name ?? "Uncategorised"}
        categoryType={cat?.type ?? "variable"}
        linkedLabel={linkedLabel(t)}
        onEdit={() => open({ editing: t })}
        onDelete={() => setPendingDelete(t)}
      />
    );
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Log everything as it happens. Type comes from the category; Shared? powers the settle-up."
        actions={
          <>
            <MonthSwitcher
              month={month}
              onChange={setMonth}
              todayMonth={todayMonth}
              className="hidden md:inline-flex"
            />
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload /> Import CSV
            </Button>
            <Button
              onClick={() => open({ date: isSameMonth(clock.today, month) ? clock.today : month })}
              className="hidden md:inline-flex"
            >
              <Plus /> Log spending
            </Button>
          </>
        }
      />
      <div className="sticky top-12 z-20 -mx-4 mb-4 flex justify-center bg-paper/90 px-4 py-2 backdrop-blur md:hidden">
        <MonthSwitcher month={month} onChange={setMonth} todayMonth={todayMonth} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={person} onValueChange={setPerson}>
          <SelectTrigger className="h-8 w-32" aria-label="Filter by who paid">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Everyone</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
            <SelectItem value="joint">Joint</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="h-8 w-40" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {activeCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="h-8 w-36" aria-label="Sort order">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="highest">Highest first</SelectItem>
            <SelectItem value="lowest">Lowest first</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={rangeActive ? "border-blue text-navy" : undefined}>
              <SlidersHorizontal /> Amount
              {rangeActive ? (
                <span className="ml-1 rounded-full bg-blue/10 px-1.5 text-[11px] text-navy">on</span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <p className="mb-2 text-[12.5px] font-medium text-navy">Amount between</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor="min-amount" className="text-[11.5px] text-ink-muted">
                  Min
                </Label>
                <MoneyInput id="min-amount" size="sm" valuePence={minPence} onChange={setMinPence} placeholder="0.00" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="max-amount" className="text-[11.5px] text-ink-muted">
                  Max
                </Label>
                <MoneyInput id="max-amount" size="sm" valuePence={maxPence} onChange={setMaxPence} placeholder="Any" />
              </div>
            </div>
            {rangeActive ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  setMinPence(null);
                  setMaxPence(null);
                }}
              >
                Clear range
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
        {filtersActive ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <FilterX /> Clear
          </Button>
        ) : null}
        {filtersActive ? (
          <span className="text-[12px] text-ink-muted">
            {filtered.length} of {inMonth.length}
          </span>
        ) : null}
      </div>

      {display.length === 0 ? (
        <SectionCard flush>
          <EmptyState
            icon={ReceiptText}
            title={filtersActive ? "Nothing matches those filters" : `Nothing logged in ${formatMonth(month, "long")}`}
            description={
              filtersActive
                ? "Loosen the filters or clear them to see the month again."
                : "Log spending as it happens, or in one batch. Two taps and a number for the common case."
            }
            action={
              filtersActive ? (
                <Button variant="outline" onClick={clearFilters}>
                  <FilterX /> Clear filters
                </Button>
              ) : (
                <Button onClick={() => open({ date: isSameMonth(clock.today, month) ? clock.today : month })}>
                  <Plus /> Log spending
                </Button>
              )
            }
          />
        </SectionCard>
      ) : (
        <div className="flex flex-col gap-4">
          {sortBy === "newest" ? (
            byDay.map(([date, txns]) => (
              <SectionCard key={date} flush className="overflow-hidden">
                <h2 className="px-4 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-muted md:px-5">
                  {formatDayHeading(date, clock.today)}
                </h2>
                <div className="divide-y divide-hairline">{txns.map(row)}</div>
              </SectionCard>
            ))
          ) : (
            <SectionCard flush className="overflow-hidden">
              <h2 className="px-4 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-muted md:px-5">
                {sortBy === "highest" ? "Highest first" : "Lowest first"} · {formatMonth(month, "long")}
              </h2>
              <div className="divide-y divide-hairline">{display.map(row)}</div>
            </SectionCard>
          )}
          <SectionCard className="bg-row-hover/40">
            <div className="grid grid-cols-3 gap-3 text-[13px]">
              <div>
                <p className="text-ink-muted">Spent{filtersActive ? " (filtered)" : ""}</p>
                <MoneyText pence={totals.spent} className="text-[16px] text-navy" />
              </div>
              <div>
                <p className="text-ink-muted">Transfers to pots</p>
                <MoneyText pence={totals.transfers} className="text-[16px] text-navy" />
              </div>
              <div>
                <p className="text-ink-muted">Entries</p>
                <p className="money text-[16px] text-navy">{filtered.length}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => (o ? null : setPendingDelete(null))}
        title="Delete this transaction?"
        description={
          pendingDelete
            ? `"${pendingDelete.description}" will be removed from the log. You can undo from the toast.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const t = pendingDelete;
          if (!t) return;
          void dispatch({ type: "deleteTransaction", id: t.id });
          toast("Deleted", {
            description: t.description,
            action: { label: "Undo", onClick: () => void dispatch({ type: "addTransaction", txn: t }) },
          });
        }}
      />
    </>
  );
}
