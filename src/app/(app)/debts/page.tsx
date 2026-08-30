"use client";

import { CreditCard, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/domain/confirm-dialog";
import { EmptyState } from "@/components/domain/empty-state";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMonth } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { debtInputSchema } from "@/domain/schemas";
import type { Debt } from "@/domain/types";
import { cn } from "@/lib/utils";
import { newId, useHousehold } from "@/store/household-store";

export default function DebtsPage() {
  const { view, users, dispatch } = useHousehold();
  const [editing, setEditing] = useState<Debt | "new" | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);
  const debts = view.debts.debts;

  return (
    <>
      <PageHeader
        title="Debts"
        description="Balances, payoff dates, avalanche vs snowball order. Feeds My Money and net worth. Empty is fine."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> Add debt
          </Button>
        }
      />
      {debts.length === 0 ? (
        <SectionCard flush>
          <EmptyState
            icon={CreditCard}
            title="No debts"
            description="Everything reads £0. Add one if you have a card, loan or overdraft to clear."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> Add debt
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <>
          <LedgerSentence className="mb-6">
            <Figure>{formatPence(view.debts.totalBalancePence, { style: "whole" })}</Figure> owed,{" "}
            <Figure>{formatPence(view.debts.totalPaymentPence, { style: "whole" })}</Figure> a month going on it.
          </LedgerSentence>
          <SectionCard
            flush
            title="All debts"
            description="Avalanche = overpay rank 1 by interest rate. Snowball = rank 1 by smallest balance. Months to clear assumes the payment stays fixed."
          >
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Owner</TableHead>
                    <TableHead>Lender</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">APR</TableHead>
                    <TableHead className="text-right">Min payment</TableHead>
                    <TableHead className="text-right">Extra</TableHead>
                    <TableHead className="text-right">Total payment</TableHead>
                    <TableHead className="text-right">Months to clear</TableHead>
                    <TableHead>Payoff</TableHead>
                    <TableHead className="text-center">Avalanche</TableHead>
                    <TableHead className="text-center">Snowball</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debts.map((d) => (
                    <TableRow key={d.debt.id}>
                      <TableCell>
                        <PersonBadge
                          owner={{ kind: "user", userId: d.debt.ownerUserId }}
                          users={users}
                          size="xs"
                          withName
                        />
                      </TableCell>
                      <TableCell className="font-medium text-ink">
                        <button type="button" className="hover:underline" onClick={() => setEditing(d.debt)}>
                          {d.debt.lender}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyText pence={d.debt.balancePence} />
                      </TableCell>
                      <TableCell className="money text-right">{(d.debt.apr * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">
                        <MoneyText pence={d.debt.minPaymentPence} />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyText pence={d.debt.extraPaymentPence} />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyText pence={d.paymentPence} className="text-navy" />
                      </TableCell>
                      <TableCell className={cn("money text-right", d.monthsToClear === null && "text-brick")}>
                        {d.monthsToClear === null ? "Payment too small" : d.monthsToClear}
                      </TableCell>
                      <TableCell className="text-ink-muted">{d.payoffDate ? formatMonth(d.payoffDate) : "—"}</TableCell>
                      <TableCell className="text-center">
                        <Rank n={d.avalancheRank} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Rank n={d.snowballRank} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </>
      )}

      <DebtDialog
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        open={editing !== null}
        debt={editing === "new" ? null : editing}
        onOpenChange={(o) => (o ? null : setEditing(null))}
        onSave={(debt) => {
          dispatch(
            view.debts.debts.some((d) => d.debt.id === debt.id)
              ? { type: "updateDebt", debt }
              : { type: "addDebt", debt },
          );
          toast.success(editing === "new" ? "Debt added" : "Debt saved");
          setEditing(null);
        }}
        onDelete={(d) => {
          setEditing(null);
          setDeleting(d);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => (o ? null : setDeleting(null))}
        title={`Remove ${deleting?.lender}?`}
        description="Use this when it's paid off. It disappears from payments and net worth."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (deleting) dispatch({ type: "deleteDebt", id: deleting.id });
          toast("Debt removed");
        }}
      />
    </>
  );
}

function Rank({ n }: { n: number }) {
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-[12px] font-semibold",
        n === 1 ? "bg-navy text-white" : "bg-row-hover text-ink-muted",
      )}
    >
      {n}
    </span>
  );
}

function DebtDialog({
  open,
  debt,
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean;
  debt: Debt | null;
  onOpenChange: (o: boolean) => void;
  onSave: (d: Debt) => void;
  onDelete: (d: Debt) => void;
}) {
  const { users } = useHousehold();
  const [ownerUserId, setOwner] = useState(debt?.ownerUserId ?? users[0].id);
  const [lender, setLender] = useState(debt?.lender ?? "");
  const [balancePence, setBalance] = useState<number | null>(debt?.balancePence ?? null);
  const [apr, setApr] = useState(debt ? String(Math.round(debt.apr * 1000) / 10) : "");
  const [minPaymentPence, setMin] = useState<number | null>(debt?.minPaymentPence ?? null);
  const [extraPaymentPence, setExtra] = useState<number | null>(debt?.extraPaymentPence ?? 0);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{debt ? "Edit debt" : "Add a debt"}</DialogTitle>
          <DialogDescription>
            Payments come off the owner's leftover; the balance comes off net worth.
          </DialogDescription>
        </DialogHeader>
        <form
          id="debt-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = debtInputSchema.safeParse({
              ownerUserId,
              lender,
              balancePence,
              apr: Number(apr) / 100,
              minPaymentPence,
              extraPaymentPence: extraPaymentPence ?? 0,
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "Check the form");
              return;
            }
            onSave({ id: debt?.id ?? newId("debt"), ...parsed.data });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Owner</Label>
              <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Owner">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    role="radio"
                    aria-checked={ownerUserId === u.id}
                    onClick={() => setOwner(u.id)}
                    className={cn(
                      "flex h-8 items-center justify-center gap-1 rounded-md border text-[12.5px] font-medium",
                      ownerUserId === u.id ? "border-blue bg-blue/8 text-navy" : "border-hairline hover:bg-row-hover",
                    )}
                  >
                    <PersonBadge owner={{ kind: "user", userId: u.id }} users={users} size="xs" /> {u.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="debt-lender">Lender</Label>
              <Input
                id="debt-lender"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                placeholder="e.g. Barclaycard"
                autoFocus
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="debt-balance">Balance</Label>
              <MoneyInput id="debt-balance" valuePence={balancePence} onChange={setBalance} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="debt-apr">APR %</Label>
              <Input
                id="debt-apr"
                type="number"
                step={0.1}
                min={0}
                max={100}
                value={apr}
                onChange={(e) => setApr(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="debt-min">Min payment £/mo</Label>
              <MoneyInput id="debt-min" valuePence={minPaymentPence} onChange={setMin} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="debt-extra">Extra payment £/mo</Label>
              <MoneyInput id="debt-extra" valuePence={extraPaymentPence} onChange={setExtra} />
            </div>
          </div>
          {error ? <p className="text-[12.5px] font-medium text-brick">{error}</p> : null}
        </form>
        <DialogFooter className="sm:justify-between">
          {debt ? (
            <Button variant="destructive" onClick={() => onDelete(debt)}>
              Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form="debt-form">
              {debt ? "Save" : "Add debt"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
