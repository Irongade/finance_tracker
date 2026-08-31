"use client";

import { Plus, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/domain/confirm-dialog";
import { EmptyState } from "@/components/domain/empty-state";
import { GoalCard } from "@/components/domain/goal-card";
import { Figure, LedgerSentence } from "@/components/domain/ledger-sentence";
import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { formatPence } from "@/domain/money";
import { goalInputSchema } from "@/domain/schemas";
import type { Goal, GoalType } from "@/domain/types";
import { newId, useHousehold } from "@/store/household-store";

export default function GoalsPage() {
  const { view, users, household, dispatch, transferCategoryId } = useHousehold();
  const { open } = useQuickAdd();
  const [adding, setAdding] = useState(false);
  const [archiving, setArchiving] = useState<Goal | null>(null);
  const goals = view.goals.goals;

  return (
    <>
      <PageHeader
        title="Goals"
        description="The pots you both pay into. Saved so far is anchored to the latest balance on Pots, never to pledges."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add goal
          </Button>
        }
      />
      <LedgerSentence className="mb-6">
        <Figure>{formatPence(view.goals.totalPledgesPence, { style: "whole" })}</Figure> a month into pots, plus{" "}
        <Figure tone="positive">{formatPence(view.goals.totalLisaBonusPence, { style: "whole" })}</Figure> of LISA bonus
        on top.
      </LedgerSentence>

      {goals.length === 0 ? (
        <SectionCard flush>
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Add a savings goal to track pledges, the LISA bonus and whether you're on track."
            action={
              <Button onClick={() => setAdding(true)}>
                <Plus /> Add goal
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => (
            <GoalCard
              key={g.goal.id}
              goal={g}
              users={users}
              lisaAnnualAllowancePence={household.settings.lisaAnnualAllowancePence}
              onPledgeChange={(userId, monthlyPence) =>
                dispatch({ type: "updatePledge", goalId: g.goal.id, userId, monthlyPence })
              }
              onArchive={() => setArchiving(g.goal)}
              onSetEmergency={() => {
                dispatch({ type: "setEmergencyFund", id: g.goal.id });
                toast.success(`${g.goal.name} is now the emergency fund`);
              }}
              onLogTransfer={() =>
                open({
                  description: `Transfer to ${g.goal.name}`,
                  categoryId: transferCategoryId("goal"),
                  linkedGoalId: g.goal.id,
                  paidBy: { kind: "joint" },
                  isShared: false,
                })
              }
            />
          ))}
        </div>
      )}

      {goals.length > 0 ? (
        <SectionCard className="mt-4" title="Totals">
          <div className="grid grid-cols-2 gap-4 text-[13px] md:grid-cols-4">
            {users.map((u) => (
              <div key={u.id}>
                <p className="flex items-center gap-1.5 text-ink-muted">
                  <PersonBadge owner={{ kind: "user", userId: u.id }} users={users} size="xs" /> {u.name} £/mo
                </p>
                <MoneyText
                  pence={view.goals.pledgesByUser[u.id] ?? 0}
                  style="whole"
                  className="text-[18px] text-navy"
                />
              </div>
            ))}
            <div>
              <p className="text-ink-muted">Total £/mo</p>
              <MoneyText pence={view.goals.totalPledgesPence} style="whole" className="text-[18px] text-navy" />
            </div>
            <div>
              <p className="text-ink-muted">LISA bonus £/mo</p>
              <MoneyText pence={view.goals.totalLisaBonusPence} style="whole" tone="positive" className="text-[18px]" />
            </div>
          </div>
          <p className="mt-4 text-[12px] text-ink-muted">
            LISA rule: each person's own contributions max{" "}
            {formatPence(household.settings.lisaAnnualAllowancePence, { style: "whole" })} per tax year (~
            {formatPence(household.settings.lisaAnnualAllowancePence / 12, { style: "whole" })}/mo). The{" "}
            {Math.round(household.settings.lisaBonusRate * 100)}% bonus is included in Required, Status and the
            forecast.
          </p>
        </SectionCard>
      ) : null}

      <GoalDialog
        key={adding ? "open" : "closed"}
        open={adding}
        onOpenChange={setAdding}
        onSave={async (goal) => {
          const ok = await dispatch({ type: "addGoal", goal });
          if (!ok) return;
          toast.success("Goal added", { description: `${goal.name}. Enter its first balance on Pots.` });
          setAdding(false);
        }}
      />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(o) => (o ? null : setArchiving(null))}
        title={`Archive ${archiving?.name}?`}
        description="It leaves the goals list, forecast and totals. Balance history is kept."
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          if (archiving) dispatch({ type: "archiveGoal", id: archiving.id });
          toast("Goal archived");
        }}
      />
    </>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (goal: Goal) => unknown; // may return a promise; the dialog awaits it
}) {
  const { users, household } = useHousehold();
  const [name, setName] = useState("");
  const [type, setType] = useState<GoalType>("standard");
  const [targetPence, setTargetPence] = useState<number | null>(null);
  const [targetMonth, setTargetMonth] = useState("");
  const [aer, setAer] = useState("0");
  const [isEmergencyFund, setEmergency] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a goal</DialogTitle>
          <DialogDescription>Pledges start at £0 for both of you; set them on the card afterwards.</DialogDescription>
        </DialogHeader>
        <form
          id="goal-form"
          className="grid gap-4"
          onSubmit={async (e) => {
            if (busy) return;
            e.preventDefault();
            const parsed = goalInputSchema.safeParse({
              name,
              type,
              targetPence,
              targetDate: targetMonth ? `${targetMonth}-01` : "",
              aer: Number(aer) / 100,
              isEmergencyFund,
              notes: null,
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "Check the form");
              return;
            }
            const id = newId("goal");
            setBusy(true);
            await onSave({
              id,
              ...parsed.data,
              sort: household.goals.length + 1,
              archived: false,
              pledges: users.map((u) => ({ goalId: id, userId: u.id, monthlyPence: 0 })),
            });
            setBusy(false);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="goal-name">Name</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Honeymoon"
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as GoalType)} className="flex gap-4">
              <div className="flex items-center gap-2 text-[13px]">
                <RadioGroupItem value="standard" id="goal-type-standard" />{" "}
                <Label htmlFor="goal-type-standard">Standard pot</Label>
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <RadioGroupItem value="lisa" id="goal-type-lisa" /> <Label htmlFor="goal-type-lisa">Lifetime ISA</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="goal-target">Target £</Label>
              <MoneyInput id="goal-target" valuePence={targetPence} onChange={setTargetPence} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-date">Target month</Label>
              <Input id="goal-date" type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="goal-aer">Interest AER %</Label>
              <Input
                id="goal-aer"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={aer}
                onChange={(e) => setAer(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-2">
              <Label htmlFor="goal-emergency" className="text-[12.5px]">
                Emergency fund
              </Label>
              <Switch id="goal-emergency" checked={isEmergencyFund} onCheckedChange={setEmergency} />
            </div>
          </div>
          {error ? <p className="text-[12.5px] font-medium text-brick">{error}</p> : null}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="goal-form" pending={busy}>
            Add goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
