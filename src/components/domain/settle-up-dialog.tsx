"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MoneyInput } from "@/components/domain/money-input";
import { PersonBadge } from "@/components/domain/person-badge";
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
import { formatPence } from "@/domain/money";
import { settlementInputSchema } from "@/domain/schemas";
import { cn } from "@/lib/utils";
import { newId, useHousehold } from "@/store/household-store";

/** Flow 3: confirm amount (pre-filled with the net) and payer, record the settlement. */
export function SettleUpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { view, users, clock, dispatch } = useHousehold();
  const net = view.settleUp.netPence;
  const defaultFrom = net > 0 ? users[1].id : users[0].id;
  const [amount, setAmount] = useState<number | null>(Math.abs(net));
  const [fromUserId, setFromUserId] = useState(defaultFrom);
  const [date, setDate] = useState(clock.today);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(Math.abs(net));
      setFromUserId(defaultFrom);
      setDate(clock.today);
      setNotes("");
      setError(null);
    }
  }, [open, net, defaultFrom, clock.today]);

  const toUserId = users.find((u) => u.id !== fromUserId)?.id ?? users[1].id;
  const fromName = users.find((u) => u.id === fromUserId)?.name ?? "";
  const toName = users.find((u) => u.id === toUserId)?.name ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settle up</DialogTitle>
          <DialogDescription>
            {view.settleUp.direction === "square"
              ? "You're all square. Record a payment anyway if one happened."
              : `${users[net > 0 ? 1 : 0].name} owes ${users[net > 0 ? 0 : 1].name} ${formatPence(Math.abs(net))}. Record the payment to net it off.`}
          </DialogDescription>
        </DialogHeader>
        <form
          id="settle-up-form"
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            if (busy) return;
            e.preventDefault();
            const parsed = settlementInputSchema.safeParse({
              amountPence: amount,
              fromUserId,
              toUserId,
              date,
              notes: notes || null,
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "Check the form");
              return;
            }
            setBusy(true);
            const ok = await dispatch({ type: "addSettlement", settlement: { id: newId("stl"), ...parsed.data } });
            setBusy(false);
            if (!ok) return;
            toast.success("Settled up", {
              description: `${fromName} paid ${toName} ${formatPence(parsed.data.amountPence)}.`,
            });
            onOpenChange(false);
          }}
        >
          <div className="grid gap-1.5">
            <Label>Who paid</Label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who paid">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  role="radio"
                  aria-checked={fromUserId === u.id}
                  onClick={() => setFromUserId(u.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    fromUserId === u.id ? "border-blue bg-blue/8 text-navy" : "border-hairline hover:bg-row-hover",
                  )}
                >
                  <PersonBadge owner={{ kind: "user", userId: u.id }} users={users} size="sm" /> {u.name} paid{" "}
                  {users.find((x) => x.id !== u.id)?.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="settle-amount">Amount</Label>
            <MoneyInput id="settle-amount" valuePence={amount} onChange={setAmount} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="settle-date">Date</Label>
              <Input id="settle-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="settle-notes">Note</Label>
              <Input
                id="settle-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          {error ? <p className="text-[12.5px] font-medium text-brick">{error}</p> : null}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="settle-up-form" pending={busy}>
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
