"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Target } from "lucide-react";
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
  const [goalDialog, setGoalDialog] = useState<"new" | Goal | null>(null);
  const [archiving, setArchiving] = useState<Goal | null>(null);
  const goals = view.goals.goals;
  const goalIds = goals.map((g) => g.goal.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onGoalDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    void dispatch({
      type: "reorderGoals",
      ids: arrayMove(goalIds, goalIds.indexOf(String(active.id)), goalIds.indexOf(String(over.id))),
    });
  };

  return (
    <>
      <PageHeader
        title="Goals"
        description="The pots you both pay into. Saved so far is anchored to the latest balance on Pots, never to pledges."
        actions={
          <Button onClick={() => setGoalDialog("new")}>
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
              <Button onClick={() => setGoalDialog("new")}>
                <Plus /> Add goal
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToParentElement]}
          onDragEnd={onGoalDragEnd}
        >
          <SortableContext items={goalIds} strategy={rectSortingStrategy}>
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((g) => (
                <SortableGoalCard key={g.goal.id} id={g.goal.id}>
                  {(handle) => (
                    <GoalCard
                      dragHandle={goals.length > 1 ? handle : undefined}
                      goal={g}
                      users={users}
                      lisaAnnualAllowancePence={household.settings.lisaAnnualAllowancePence}
                      onPledgeChange={(userId, monthlyPence) =>
                        dispatch({ type: "updatePledge", goalId: g.goal.id, userId, monthlyPence })
                      }
                      onEdit={() => setGoalDialog(g.goal)}
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
                  )}
                </SortableGoalCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
        key={goalDialog === null ? "closed" : goalDialog === "new" ? "new" : goalDialog.id}
        open={goalDialog !== null}
        goal={goalDialog === "new" ? null : goalDialog}
        onOpenChange={(o) => (o ? null : setGoalDialog(null))}
        onSave={async (goal) => {
          const isNew = goalDialog === "new";
          const ok = await dispatch(isNew ? { type: "addGoal", goal } : { type: "updateGoal", goal });
          if (!ok) return;
          toast.success(isNew ? "Goal added" : "Goal saved", {
            description: isNew ? `${goal.name}. Enter its first balance on Pots.` : goal.name,
          });
          setGoalDialog(null);
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

function SortableGoalCard({ id, children }: { id: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label="Reorder goal"
      className="inline-flex size-6 cursor-grab touch-none items-center justify-center rounded text-ink-muted/60 hover:bg-row-hover hover:text-ink-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-90" : undefined}
    >
      {children(handle)}
    </div>
  );
}

function GoalDialog({
  open,
  goal,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  /** null = create; otherwise the goal being edited */
  goal: Goal | null;
  onOpenChange: (o: boolean) => void;
  onSave: (goal: Goal) => unknown; // may return a promise; the dialog awaits it
}) {
  const { users, household } = useHousehold();
  const [name, setName] = useState(goal?.name ?? "");
  const [type, setType] = useState<GoalType>(goal?.type ?? "standard");
  const [targetPence, setTargetPence] = useState<number | null>(goal?.targetPence ?? null);
  const [targetMonth, setTargetMonth] = useState(goal ? goal.targetDate.slice(0, 7) : "");
  const [aer, setAer] = useState(goal ? String(goal.aer * 100) : "0");
  const [isEmergencyFund, setEmergency] = useState(goal?.isEmergencyFund ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "Add a goal"}</DialogTitle>
          <DialogDescription>
            {goal
              ? "Pledges are edited on the card itself."
              : "Pledges start at £0 for both of you; set them on the card afterwards."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="goal-form"
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
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
            const id = goal?.id ?? newId("goal");
            setBusy(true);
            await onSave({
              id,
              ...parsed.data,
              sort: goal?.sort ?? household.goals.length + 1,
              archived: goal?.archived ?? false,
              pledges: goal?.pledges ?? users.map((u) => ({ goalId: id, userId: u.id, monthlyPence: 0 })),
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
            {goal ? "Save" : "Add goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
