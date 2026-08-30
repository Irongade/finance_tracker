"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BillsTable } from "@/components/domain/bills-table";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { MoneyInput } from "@/components/domain/money-input";
import { PersonBadge } from "@/components/domain/person-badge";
import { useQuickAdd } from "@/components/domain/quick-add-context";
import { SectionCard } from "@/components/domain/section-card";
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
import { billInputSchema } from "@/domain/schemas";
import type { Bill, BillView, Owner } from "@/domain/types";
import { cn } from "@/lib/utils";
import { newId, useHousehold } from "@/mock/store";

export default function BillsPage() {
  const { view, users, household, clock, dispatch } = useHousehold();
  const { open } = useQuickAdd();
  const [editing, setEditing] = useState<Bill | null | "new">(null);

  const joint = view.bills.bills.filter((b) => b.bill.owner.kind === "joint");
  const personal = (userId: string) =>
    view.bills.bills.filter((b) => b.bill.owner.kind === "user" && b.bill.owner.userId === userId);

  const logPayment = (b: BillView) =>
    open({
      description: b.bill.name,
      categoryId: b.bill.categoryId,
      amountPence: b.bill.monthlyPence,
      paidBy: b.bill.owner,
      isShared: b.bill.owner.kind === "joint",
      linkedBillId: b.bill.id,
    });

  const overdue = view.bills.overdueCount;

  return (
    <>
      <PageHeader
        title="Bills"
        description={`Recurring bills with live status for ${formatMonth(monthOf(clock.today), "long")}. Variable spend like groceries is budgeted on Budgets.`}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> Add bill
          </Button>
        }
      />
      <LedgerSentence className="mb-6">
        {overdue > 0 ? (
          <>
            <Figure tone="negative">{overdue}</Figure> {overdue === 1 ? "bill is" : "bills are"} overdue this month.
          </>
        ) : (
          <>Every bill due so far is paid.</>
        )}
      </LedgerSentence>

      <div className="flex flex-col gap-4">
        <SectionCard
          title="Joint fixed bills"
          description="Paid from the joint account; split at your household rate"
          flush
        >
          <BillsTable
            bills={joint}
            users={users}
            onLogPayment={logPayment}
            onEdit={(b) => setEditing(b.bill)}
            totalLabel="Total joint bills"
            totalPence={view.bills.totalJointBillsPence}
            emptyTitle="No joint bills yet"
          />
          <p className="px-5 pb-4 pt-2 text-[12px] text-ink-muted md:px-6">
            Status looks for a payment linked to the bill this month, or the bill name inside a description. Direct
            debits you don't log just show as Due or OVERDUE; the budget is still right.
          </p>
        </SectionCard>
        <div className="grid gap-4 md:grid-cols-2">
          {users.map((u) => (
            <SectionCard
              key={u.id}
              title={
                <span className="flex items-center gap-2">
                  <PersonBadge owner={{ kind: "user", userId: u.id }} users={users} size="sm" /> {u.name}'s personal
                  bills
                </span>
              }
              description="Things only they pay"
              flush
            >
              <BillsTable
                bills={personal(u.id)}
                users={users}
                onLogPayment={logPayment}
                onEdit={(b) => setEditing(b.bill)}
                totalLabel="Total personal bills"
                totalPence={view.bills.personalBillsPence[u.id] ?? 0}
                emptyTitle={`No personal bills for ${u.name}`}
              />
            </SectionCard>
          ))}
        </div>
      </div>

      <BillDialog
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        open={editing !== null}
        bill={editing === "new" ? null : editing}
        onOpenChange={(o) => (o ? null : setEditing(null))}
        onSave={(bill) => {
          dispatch(
            household.bills.some((b) => b.id === bill.id) ? { type: "updateBill", bill } : { type: "addBill", bill },
          );
          toast.success(editing === "new" ? "Bill added" : "Bill saved", { description: bill.name });
          setEditing(null);
        }}
        onArchive={(id) => {
          dispatch({ type: "archiveBill", id });
          toast("Bill archived", { description: "History is kept; it no longer counts in budgets." });
          setEditing(null);
        }}
      />
    </>
  );
}

function BillDialog({
  open,
  bill,
  onOpenChange,
  onSave,
  onArchive,
}: {
  open: boolean;
  bill: Bill | null;
  onOpenChange: (o: boolean) => void;
  onSave: (bill: Bill) => void;
  onArchive: (id: string) => void;
}) {
  const { household, users } = useHousehold();
  const fixedCategories = useMemo(
    () => household.categories.filter((c) => !c.archived && c.type === "fixed"),
    [household.categories],
  );
  const [name, setName] = useState(bill?.name ?? "");
  const [categoryId, setCategoryId] = useState(bill?.categoryId ?? "");
  const [monthlyPence, setMonthlyPence] = useState<number | null>(bill?.monthlyPence ?? null);
  const [dueDay, setDueDay] = useState<string>(bill?.dueDay?.toString() ?? "");
  const [owner, setOwner] = useState<Owner>(bill?.owner ?? { kind: "joint" });
  const [error, setError] = useState<string | null>(null);

  const ownerOptions: Owner[] = [
    { kind: "joint" },
    { kind: "user", userId: users[0].id },
    { kind: "user", userId: users[1].id },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bill ? "Edit bill" : "Add a bill"}</DialogTitle>
          <DialogDescription>
            Recurring, fixed amounts only. The category decides which budget row it feeds.
          </DialogDescription>
        </DialogHeader>
        <form
          id="bill-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = billInputSchema.safeParse({
              name,
              categoryId,
              monthlyPence,
              dueDay: dueDay === "" ? null : Number(dueDay),
              owner,
              notes: bill?.notes ?? null,
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "Check the form");
              return;
            }
            onSave({ id: bill?.id ?? newId("bill"), archived: false, ...parsed.data });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="bill-name">Name</Label>
            <Input
              id="bill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Water"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="bill-category">Category</Label>
              <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                <SelectTrigger id="bill-category" className="w-full">
                  <SelectValue placeholder="Pick one" />
                </SelectTrigger>
                <SelectContent>
                  {fixedCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bill-amount">Monthly £</Label>
              <MoneyInput id="bill-amount" valuePence={monthlyPence} onChange={setMonthlyPence} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="bill-due">Due day (1-31)</Label>
              <Input
                id="bill-due"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Paid by</Label>
              <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Paid by">
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
                        "flex h-8 items-center justify-center rounded-md border text-[12.5px] font-medium",
                        selected ? "border-blue bg-blue/8 text-navy" : "border-hairline hover:bg-row-hover",
                      )}
                    >
                      <PersonBadge owner={o} users={users} size="xs" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {error ? <p className="text-[12.5px] font-medium text-brick">{error}</p> : null}
        </form>
        <DialogFooter className="sm:justify-between">
          {bill ? (
            <Button variant="destructive" onClick={() => onArchive(bill.id)}>
              Archive
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form="bill-form">
              {bill ? "Save" : "Add bill"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
