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
import { GripVertical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/domain/section-card";
import type { NavItem } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import { useNavOrder } from "@/hooks/use-nav-order";
import { cn } from "@/lib/utils";

function SortableNavRow({ item }: { item: NavItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.href });
  const Icon = item.icon;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5",
        isDragging && "relative z-10 bg-surface opacity-90 shadow-lg",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${item.label}`}
        className="inline-flex size-6 cursor-grab touch-none items-center justify-center rounded text-ink-muted/60 hover:bg-row-hover hover:text-ink-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <Icon className="size-4 text-ink-muted" aria-hidden />
      <span className="text-[13.5px] font-medium text-ink">{item.label}</span>
    </li>
  );
}

/** Sidebar order, saved on this device only - each of you keeps your own. */
export function NavOrderCard() {
  const { items, customised, setOrder, reset } = useNavOrder();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((i) => i.href);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <SectionCard
      title="Sidebar order"
      description="Drag to arrange the menu the way you think. Saved on this device only, so you can each have your own."
      action={
        customised ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset();
              toast("Default order restored");
            }}
          >
            <RotateCcw /> Reset
          </Button>
        ) : undefined
      }
      flush
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-hairline">
            {items.map((item) => (
              <SortableNavRow key={item.href} item={item} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <p className="px-4 py-3 text-[12px] text-ink-muted">
        The phone tab bar keeps Dashboard, Transactions, + and Goals fixed; everything else follows this order under
        More.
      </p>
    </SectionCard>
  );
}
