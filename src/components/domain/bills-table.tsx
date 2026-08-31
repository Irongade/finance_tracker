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
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ReceiptText } from "lucide-react";
import { BillStatusChip } from "@/components/domain/chips";
import { EmptyState } from "@/components/domain/empty-state";
import { MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, ordinal } from "@/domain/dates";
import type { BillView, User } from "@/domain/types";
import { cn } from "@/lib/utils";

/** Manual order (drag to change); overdue rows stay highlighted rather than jumping around. */
export function sortBills(bills: BillView[]): BillView[] {
  return [...bills].sort((a, b) => a.bill.sort - b.bill.sort || a.bill.name.localeCompare(b.bill.name));
}

export interface BillsTableProps {
  bills: BillView[];
  users: [User, User];
  onLogPayment: (bill: BillView) => void;
  onEdit?: (bill: BillView) => void;
  /** enables drag handles; receives every id in this table in its new order */
  onReorder?: (ids: string[]) => void;
  showOwner?: boolean;
  totalLabel?: string;
  totalPence?: number;
  emptyTitle?: string;
  emptyAction?: React.ReactNode;
}

function DragHandle({
  attributes,
  listeners,
  name,
}: {
  attributes: React.HTMLAttributes<HTMLButtonElement>;
  listeners: Record<string, unknown> | undefined;
  name: string;
}) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`Reorder ${name}`}
      className="inline-flex size-6 cursor-grab touch-none items-center justify-center rounded text-ink-muted/60 hover:bg-row-hover hover:text-ink-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
}

function SortableTr({
  b,
  users,
  showOwner,
  draggable,
  onLogPayment,
  onEdit,
}: {
  b: BillView;
  users: [User, User];
  showOwner: boolean;
  draggable: boolean;
  onLogPayment: (b: BillView) => void;
  onEdit?: (b: BillView) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: b.bill.id,
    disabled: !draggable,
  });
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        b.status === "overdue" && "bg-blush/40 hover:bg-blush/60",
        isDragging && "relative z-10 bg-surface shadow-md",
      )}
    >
      {draggable ? (
        <TableCell className="w-8 pr-0">
          <DragHandle attributes={attributes} listeners={listeners} name={b.bill.name} />
        </TableCell>
      ) : null}
      <TableCell className="font-medium text-ink">
        {onEdit ? (
          <button
            type="button"
            className="rounded-sm text-left hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => onEdit(b)}
          >
            {b.bill.name}
          </button>
        ) : (
          b.bill.name
        )}
      </TableCell>
      <TableCell className="text-ink-muted">{b.categoryName}</TableCell>
      {showOwner ? (
        <TableCell>
          <PersonBadge owner={b.bill.owner} users={users} size="xs" withName />
        </TableCell>
      ) : null}
      <TableCell className="text-right">
        <MoneyText pence={b.bill.monthlyPence} style="whole" />
      </TableCell>
      <TableCell className="text-ink-muted">
        {b.dueDate ? `${ordinal(b.bill.dueDay ?? 1)} · ${formatDate(b.dueDate, "dayMonth")}` : "—"}
      </TableCell>
      <TableCell>
        <BillStatusChip status={b.status} />
      </TableCell>
      <TableCell className="text-right">
        {b.status !== "paid" ? (
          <Button variant="outline" size="sm" onClick={() => onLogPayment(b)}>
            Log payment
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

function SortableLi({
  b,
  users,
  showOwner,
  draggable,
  onLogPayment,
  onEdit,
}: {
  b: BillView;
  users: [User, User];
  showOwner: boolean;
  draggable: boolean;
  onLogPayment: (b: BillView) => void;
  onEdit?: (b: BillView) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: b.bill.id,
    disabled: !draggable,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        b.status === "overdue" && "bg-blush/40",
        isDragging && "relative z-10 bg-surface shadow-md",
      )}
    >
      {draggable ? <DragHandle attributes={attributes} listeners={listeners} name={b.bill.name} /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {showOwner ? <PersonBadge owner={b.bill.owner} users={users} size="xs" /> : null}
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(b)}
              className="truncate text-left text-[13.5px] font-medium text-ink underline-offset-2 focus-visible:ring-3 focus-visible:ring-ring/50 active:underline"
            >
              {b.bill.name}
            </button>
          ) : (
            <p className="truncate text-[13.5px] font-medium text-ink">{b.bill.name}</p>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {b.categoryName}
          {b.dueDate ? ` · due ${ordinal(b.bill.dueDay ?? 1)}` : ""}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <BillStatusChip status={b.status} />
          {b.status !== "paid" ? (
            <Button variant="link" size="xs" className="h-5 px-0" onClick={() => onLogPayment(b)}>
              Log payment
            </Button>
          ) : null}
        </div>
      </div>
      <MoneyText pence={b.bill.monthlyPence} style="whole" className="text-[14px]" />
    </li>
  );
}

export function BillsTable({
  bills,
  users,
  onLogPayment,
  onEdit,
  onReorder,
  showOwner = false,
  totalLabel,
  totalPence,
  emptyTitle = "No bills yet",
  emptyAction,
}: BillsTableProps) {
  const sorted = sortBills(bills);
  const ids = sorted.map((b) => b.bill.id);
  const draggable = Boolean(onReorder) && sorted.length > 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder?.(arrayMove(ids, from, to));
  };

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title={emptyTitle}
        description="Add a recurring bill to budget for it and track when it's paid."
        action={emptyAction}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      {/* desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {draggable ? <TableHead className="w-8" aria-label="Reorder" /> : null}
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              {showOwner ? <TableHead>Owner</TableHead> : null}
              <TableHead className="text-right">£/mo</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {sorted.map((b) => (
                <SortableTr
                  key={b.bill.id}
                  b={b}
                  users={users}
                  showOwner={showOwner}
                  draggable={draggable}
                  onLogPayment={onLogPayment}
                  onEdit={onEdit}
                />
              ))}
            </SortableContext>
          </TableBody>
          {totalLabel !== undefined && totalPence !== undefined ? (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={(showOwner ? 3 : 2) + (draggable ? 1 : 0)} className="font-semibold text-navy">
                  {totalLabel}
                </TableCell>
                <TableCell className="text-right">
                  <MoneyText pence={totalPence} style="whole" className="text-navy" />
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>
      {/* mobile */}
      <ul className="divide-y divide-hairline md:hidden">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {sorted.map((b) => (
            <SortableLi
              key={b.bill.id}
              b={b}
              users={users}
              showOwner={showOwner}
              draggable={draggable}
              onLogPayment={onLogPayment}
              onEdit={onEdit}
            />
          ))}
        </SortableContext>
        {totalLabel !== undefined && totalPence !== undefined ? (
          <li className="flex items-center justify-between px-4 py-3 font-semibold text-navy">
            <span className="text-[13px]">{totalLabel}</span>
            <MoneyText pence={totalPence} style="whole" className="text-[14px]" />
          </li>
        ) : null}
      </ul>
    </DndContext>
  );
}
