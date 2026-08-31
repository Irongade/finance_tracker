"use client";

import { ReceiptText } from "lucide-react";
import { BillStatusChip } from "@/components/domain/chips";
import { EmptyState } from "@/components/domain/empty-state";
import { MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, ordinal } from "@/domain/dates";
import type { BillView, User } from "@/domain/types";
import { cn } from "@/lib/utils";

const STATUS_ORDER = { overdue: 0, due: 1, paid: 2, untracked: 3 } as const;

/** Overdue items float to the top (section 7.4). */
export function sortBills(bills: BillView[]): BillView[] {
  return [...bills].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (s !== 0) return s;
    return (a.dueDate ?? "9") < (b.dueDate ?? "9") ? -1 : 1;
  });
}

export interface BillsTableProps {
  bills: BillView[];
  users: [User, User];
  onLogPayment: (bill: BillView) => void;
  onEdit?: (bill: BillView) => void;
  showOwner?: boolean;
  totalLabel?: string;
  totalPence?: number;
  emptyTitle?: string;
  emptyAction?: React.ReactNode;
}

export function BillsTable({
  bills,
  users,
  onLogPayment,
  onEdit,
  showOwner = false,
  totalLabel,
  totalPence,
  emptyTitle = "No bills yet",
  emptyAction,
}: BillsTableProps) {
  const sorted = sortBills(bills);
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
    <>
      {/* desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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
            {sorted.map((b) => (
              <TableRow key={b.bill.id} className={cn(b.status === "overdue" && "bg-blush/40 hover:bg-blush/60")}>
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
            ))}
          </TableBody>
          {totalLabel !== undefined && totalPence !== undefined ? (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={showOwner ? 3 : 2} className="font-semibold text-navy">
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
        {sorted.map((b) => (
          <li
            key={b.bill.id}
            className={cn("flex items-center gap-3 px-4 py-3", b.status === "overdue" && "bg-blush/40")}
          >
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
        ))}
        {totalLabel !== undefined && totalPence !== undefined ? (
          <li className="flex items-center justify-between px-4 py-3 font-semibold text-navy">
            <span className="text-[13px]">{totalLabel}</span>
            <MoneyText pence={totalPence} style="whole" className="text-[14px]" />
          </li>
        ) : null}
      </ul>
    </>
  );
}
