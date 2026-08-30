"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Link2, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/domain/confirm-dialog";
import { MoneyInput } from "@/components/domain/money-input";
import { PersonBadge } from "@/components/domain/person-badge";
import { useQuickAdd } from "@/components/domain/quick-add-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type TransactionInput, transactionInputSchema } from "@/domain/schemas";
import type { Owner, Transaction } from "@/domain/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { newId, useHousehold } from "@/mock/store";

const NONE = "__none__";

/**
 * Flow 1: + -> amount -> description -> category -> save (section 8).
 * Defaults: today, paid by = current user, shared = No unless Joint.
 */
export function QuickAddSheet() {
  const { isOpen, prefill, close } = useQuickAdd();
  const { household, users, clock, currentUserId, dispatch } = useHousehold();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editing = prefill?.editing ?? null;

  const defaults = useMemo<TransactionInput>(() => {
    if (editing) return { ...editing, notes: editing.notes };
    const paidBy: Owner = prefill?.paidBy ?? { kind: "user", userId: currentUserId };
    return {
      amountPence: prefill?.amountPence ?? (Number.NaN as number),
      description: prefill?.description ?? "",
      categoryId: prefill?.categoryId ?? "",
      paidBy,
      isShared: prefill?.isShared ?? paidBy.kind === "joint",
      shareOverride: null,
      date: prefill?.date ?? clock.today,
      linkedBillId: prefill?.linkedBillId ?? null,
      linkedGoalId: prefill?.linkedGoalId ?? null,
      linkedInvestmentId: prefill?.linkedInvestmentId ?? null,
      notes: prefill?.notes ?? null,
    };
  }, [editing, prefill, currentUserId, clock.today]);

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionInputSchema),
    defaultValues: defaults,
    mode: "onSubmit",
  });
  const { control, register, handleSubmit, watch, setValue, reset, formState } = form;

  useEffect(() => {
    if (isOpen) {
      reset(defaults);
      setMoreOpen(
        Boolean(
          prefill?.linkedBillId ||
            prefill?.linkedGoalId ||
            prefill?.linkedInvestmentId ||
            (editing?.shareOverride !== null && editing !== null),
        ),
      );
    }
  }, [isOpen, defaults, reset, prefill, editing]);

  const categories = useMemo(
    () => household.categories.filter((c) => !c.archived).sort((a, b) => a.sort - b.sort),
    [household.categories],
  );
  const activeBills = useMemo(() => household.bills.filter((b) => !b.archived), [household.bills]);
  const activeGoals = useMemo(() => household.goals.filter((g) => !g.archived), [household.goals]);
  const activeInvestments = useMemo(
    () => household.investmentAccounts.filter((a) => !a.archived),
    [household.investmentAccounts],
  );

  const categoryId = watch("categoryId");
  const description = watch("description");
  const paidBy = watch("paidBy");
  const isShared = watch("isShared");
  const amountPence = watch("amountPence");
  const linkedBillId = watch("linkedBillId");
  const linkedGoalId = watch("linkedGoalId");
  const linkedInvestmentId = watch("linkedInvestmentId");
  const shareOverride = watch("shareOverride");
  const categoryType = categories.find((c) => c.id === categoryId)?.type ?? null;
  const isTransfer = categoryType === "transfer";

  // Auto-suggest a bill link when the description contains a bill name (section 2.3).
  const suggestedBill = useMemo(() => {
    if (!description || linkedBillId || linkedGoalId || linkedInvestmentId || isTransfer) return null;
    const d = description.toLowerCase();
    return activeBills.find((b) => d.includes(b.name.toLowerCase())) ?? null;
  }, [description, linkedBillId, linkedGoalId, linkedInvestmentId, isTransfer, activeBills]);

  useEffect(() => {
    if (suggestedBill && !editing) {
      setValue("linkedBillId", suggestedBill.id);
      if (!categoryId) setValue("categoryId", suggestedBill.categoryId);
    }
  }, [suggestedBill, editing, setValue, categoryId]);

  const onSubmit = (data: TransactionInput) => {
    const txn: Transaction = {
      id: editing?.id ?? newId("txn"),
      ...data,
      isShared: isTransfer ? false : data.isShared,
      shareOverride: isTransfer || !data.isShared ? null : data.shareOverride,
      notes: data.notes || null,
    };
    if (editing) {
      dispatch({ type: "updateTransaction", txn });
      toast.success("Saved");
    } else {
      dispatch({ type: "addTransaction", txn });
      toast.success(isTransfer ? "Transfer logged" : "Logged", { description: `${data.description}` });
    }
    close();
  };

  const linkedBill = activeBills.find((b) => b.id === linkedBillId);
  const sendTo = linkedGoalId ? `goal:${linkedGoalId}` : linkedInvestmentId ? `inv:${linkedInvestmentId}` : NONE;
  const submitLabel = editing ? "Save changes" : isTransfer ? "Log transfer" : "Log spending";

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (o ? null : close())}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 overflow-y-auto p-0",
          isDesktop ? "w-[440px] sm:max-w-[440px]" : "max-h-[92dvh] rounded-t-2xl",
        )}
      >
        <SheetHeader className="px-5 pt-5 pb-2">
          <SheetTitle className="display text-[22px] text-navy">
            {editing ? "Edit transaction" : "Log spending"}
          </SheetTitle>
          <SheetDescription className="text-[12.5px]">
            {editing ? "Change anything, then save." : "Amount, what it was, category. Everything else is optional."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 pb-6">
          <div className="grid gap-1.5">
            <Label htmlFor="qa-amount">Amount</Label>
            <Controller
              control={control}
              name="amountPence"
              render={({ field }) => (
                <MoneyInput
                  id="qa-amount"
                  size="lg"
                  autoFocus
                  allowNegative
                  valuePence={Number.isFinite(field.value) ? field.value : null}
                  onChange={(v) => field.onChange(v ?? Number.NaN)}
                  invalid={Boolean(formState.errors.amountPence)}
                />
              )}
            />
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-brick">{formState.errors.amountPence?.message}</span>
              {Number.isFinite(amountPence) && amountPence < 0 ? (
                <span className="font-medium text-fern">Refund</span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="qa-description">Description</Label>
            <Input
              id="qa-description"
              placeholder="e.g. Weekly shop"
              autoComplete="off"
              {...register("description")}
              aria-invalid={Boolean(formState.errors.description) || undefined}
            />
            {formState.errors.description ? (
              <p className="text-[12px] text-brick">{formState.errors.description.message}</p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="qa-category">Category</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="qa-category"
                    className="w-full"
                    aria-invalid={Boolean(formState.errors.categoryId) || undefined}
                  >
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["variable", "fixed", "transfer"] as const).map((type) => (
                      <SelectGroup key={type}>
                        <SelectLabel>
                          {type === "variable" ? "Variable spending" : type === "fixed" ? "Fixed bills" : "Transfers"}
                        </SelectLabel>
                        {categories
                          .filter((c) => c.type === type)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {formState.errors.categoryId ? (
              <p className="text-[12px] text-brick">{formState.errors.categoryId.message}</p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label>Paid by</Label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Paid by">
              {(
                [
                  { kind: "user", userId: users[0].id },
                  { kind: "user", userId: users[1].id },
                  { kind: "joint" },
                ] as Owner[]
              ).map((o) => {
                const selected =
                  o.kind === paidBy.kind &&
                  (o.kind === "joint" || (paidBy.kind === "user" && paidBy.userId === o.userId));
                const label = o.kind === "joint" ? "Joint" : users.find((u) => u.id === o.userId)?.name;
                return (
                  <button
                    key={o.kind === "joint" ? "joint" : o.userId}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setValue("paidBy", o);
                      if (o.kind === "joint") setValue("isShared", true);
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[13px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected ? "border-blue bg-blue/8 text-navy" : "border-hairline hover:bg-row-hover",
                    )}
                  >
                    <PersonBadge owner={o} users={users} size="xs" /> {label}
                  </button>
                );
              })}
            </div>
          </div>

          {!isTransfer ? (
            <div className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2.5">
              <div>
                <Label htmlFor="qa-shared" className="text-[13px]">
                  Shared cost
                </Label>
                <p className="text-[12px] text-ink-muted">
                  {paidBy.kind === "joint"
                    ? "Paid from the joint account, so already fair."
                    : "Counts towards settle-up at your split."}
                </p>
              </div>
              <Switch id="qa-shared" checked={isShared} onCheckedChange={(v) => setValue("isShared", v)} />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="qa-send-to">Send to</Label>
              <Select
                value={sendTo}
                onValueChange={(v) => {
                  setValue("linkedGoalId", v.startsWith("goal:") ? v.slice(5) : null);
                  setValue("linkedInvestmentId", v.startsWith("inv:") ? v.slice(4) : null);
                  setValue("linkedBillId", null);
                }}
              >
                <SelectTrigger id="qa-send-to" className="w-full">
                  <SelectValue placeholder="Pick a pot or investment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not linked</SelectItem>
                  {activeGoals.length ? (
                    <SelectGroup>
                      <SelectLabel>Savings pots</SelectLabel>
                      {activeGoals.map((g) => (
                        <SelectItem key={g.id} value={`goal:${g.id}`}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null}
                  {activeInvestments.length ? (
                    <SelectGroup>
                      <SelectLabel>Investments</SelectLabel>
                      {activeInvestments.map((a) => (
                        <SelectItem key={a.id} value={`inv:${a.id}`}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          )}

          {linkedBill && !isTransfer ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-mint/60 px-3 py-2 text-[12.5px] text-fern">
              <span className="flex items-center gap-1.5">
                <Link2 className="size-3.5" aria-hidden /> Pays the <strong>{linkedBill.name}</strong> bill this month
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Unlink bill"
                onClick={() => setValue("linkedBillId", null)}
              >
                <X />
              </Button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className="flex items-center gap-1 self-start text-[12.5px] font-medium text-blue hover:underline"
            aria-expanded={moreOpen}
          >
            <ChevronDown className={cn("size-3.5 transition-transform", moreOpen && "rotate-180")} aria-hidden /> More
            options
          </button>

          {moreOpen ? (
            <div className="grid gap-4 rounded-lg border border-hairline p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="qa-date">Date</Label>
                  <Input id="qa-date" type="date" {...register("date")} />
                </div>
                {!isTransfer && isShared ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="qa-share">{users[0].name}'s share %</Label>
                    <Input
                      id="qa-share"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      placeholder="Household split"
                      value={shareOverride === null ? "" : Math.round(shareOverride * 100)}
                      onChange={(e) =>
                        setValue(
                          "shareOverride",
                          e.target.value === "" ? null : Math.min(100, Math.max(0, Number(e.target.value))) / 100,
                        )
                      }
                    />
                  </div>
                ) : null}
              </div>
              {!isTransfer ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="qa-bill">Link to a bill</Label>
                  <Select
                    value={linkedBillId ?? NONE}
                    onValueChange={(v) => setValue("linkedBillId", v === NONE ? null : v)}
                  >
                    <SelectTrigger id="qa-bill" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not a bill payment</SelectItem>
                      {activeBills.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="grid gap-1.5">
                <Label htmlFor="qa-notes">Notes</Label>
                <Textarea
                  id="qa-notes"
                  rows={2}
                  placeholder="Optional"
                  {...register("notes", { setValueAs: (v) => (v === "" ? null : v) })}
                />
              </div>
            </div>
          ) : null}

          {formState.errors.linkedBillId ? (
            <p className="text-[12px] text-brick">{formState.errors.linkedBillId.message}</p>
          ) : null}

          <div className="mt-1 flex items-center gap-2">
            {editing ? (
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete transaction"
              >
                <Trash2 /> Delete
              </Button>
            ) : null}
            <Button type="submit" size="lg" className="flex-1">
              {submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
      {editing ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this transaction?"
          description={`"${editing.description}" will be removed from the log. You can undo from the toast.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            dispatch({ type: "deleteTransaction", id: editing.id });
            close();
            toast("Deleted", {
              description: editing.description,
              action: { label: "Undo", onClick: () => dispatch({ type: "addTransaction", txn: editing }) },
            });
          }}
        />
      ) : null}
    </Sheet>
  );
}
