"use client";

import { Plus, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/domain/confirm-dialog";
import { EmptyState } from "@/components/domain/empty-state";
import { MoneyText } from "@/components/domain/money-text";
import { MonthSwitcher } from "@/components/domain/month-switcher";
import { useQuickAdd } from "@/components/domain/quick-add-context";
import { SectionCard } from "@/components/domain/section-card";
import { TransactionRow } from "@/components/domain/transaction-row";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDayHeading, formatMonth, isSameMonth, monthOf } from "@/domain/dates";
import type { Transaction } from "@/domain/types";
import { transactionType } from "@/server/calc";
import { useHousehold } from "@/store/household-store";

export default function TransactionsPage() {
  const { household, users, clock, dispatch, categoryById } = useHousehold();
  const { open } = useQuickAdd();
  const [month, setMonth] = useState(monthOf(clock.today));
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const types = useMemo(() => new Map(household.categories.map((c) => [c.id, c.type])), [household.categories]);
  const inMonth = useMemo(
    () =>
      household.transactions
        .filter((t) => isSameMonth(t.date, month))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1)),
    [household.transactions, month],
  );
  const byDay = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const t of inMonth) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);
    return [...groups.entries()];
  }, [inMonth]);

  const totals = useMemo(() => {
    let spent = 0;
    let transfers = 0;
    for (const t of inMonth) {
      if (transactionType(t, types) === "transfer") transfers += t.amountPence;
      else spent += t.amountPence;
    }
    return { spent, transfers };
  }, [inMonth, types]);

  const linkedLabel = (t: Transaction): string | null => {
    if (t.linkedBillId) return household.bills.find((b) => b.id === t.linkedBillId)?.name ?? null;
    if (t.linkedGoalId) return household.goals.find((g) => g.id === t.linkedGoalId)?.name ?? null;
    if (t.linkedInvestmentId)
      return household.investmentAccounts.find((a) => a.id === t.linkedInvestmentId)?.name ?? null;
    return null;
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Log everything as it happens. Type comes from the category; Shared? powers the settle-up."
        actions={
          <>
            <MonthSwitcher month={month} onChange={setMonth} className="hidden md:inline-flex" />
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
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      {byDay.length === 0 ? (
        <SectionCard flush>
          <EmptyState
            icon={ReceiptText}
            title={`Nothing logged in ${formatMonth(month, "long")}`}
            description="Log spending as it happens, or in one batch. Two taps and a number for the common case."
            action={
              <Button onClick={() => open({ date: isSameMonth(clock.today, month) ? clock.today : month })}>
                <Plus /> Log spending
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <div className="flex flex-col gap-4">
          {byDay.map(([date, txns]) => (
            <SectionCard key={date} flush className="overflow-hidden">
              <h2 className="px-4 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-muted md:px-5">
                {formatDayHeading(date, clock.today)}
              </h2>
              <div className="divide-y divide-hairline">
                {txns.map((t) => {
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
                })}
              </div>
            </SectionCard>
          ))}
          <SectionCard className="bg-row-hover/40">
            <div className="grid grid-cols-3 gap-3 text-[13px]">
              <div>
                <p className="text-ink-muted">Spent</p>
                <MoneyText pence={totals.spent} className="text-[16px] text-navy" />
              </div>
              <div>
                <p className="text-ink-muted">Transfers to pots</p>
                <MoneyText pence={totals.transfers} className="text-[16px] text-navy" />
              </div>
              <div>
                <p className="text-ink-muted">Entries</p>
                <p className="money text-[16px] text-navy">{inMonth.length}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

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
          dispatch({ type: "deleteTransaction", id: t.id });
          toast("Deleted", {
            description: t.description,
            action: { label: "Undo", onClick: () => dispatch({ type: "addTransaction", txn: t }) },
          });
        }}
      />
    </>
  );
}
