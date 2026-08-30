"use client";

import { ArrowRightLeft, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { CategoryChip, Chip } from "@/components/domain/chips";
import { MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CategoryType, Transaction, User } from "@/domain/types";
import { cn } from "@/lib/utils";

export interface TransactionRowProps {
  txn: Transaction;
  users: [User, User];
  categoryName: string;
  categoryType: CategoryType;
  /** "Rent" (bill), "Ade's LISA" (goal) or "S&S ISA" (investment) */
  linkedLabel?: string | null;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionRow({
  txn,
  users,
  categoryName,
  categoryType,
  linkedLabel,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const isRefund = txn.amountPence < 0;
  const isTransfer = categoryType === "transfer";
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-row-hover md:px-5">
      <PersonBadge owner={txn.paidBy} users={users} size="md" />
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <p className="truncate text-[13.5px] font-medium text-ink">{txn.description}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <CategoryChip name={categoryName} />
          {txn.isShared && !isTransfer ? <Chip tone="info">Shared</Chip> : null}
          {txn.shareOverride !== null && txn.isShared ? (
            <Chip tone="outline">
              {Math.round(txn.shareOverride * 100)}% {users[0].name}
            </Chip>
          ) : null}
          {isRefund ? <Chip tone="positive">Refund</Chip> : null}
          {linkedLabel ? (
            <Chip tone="outline" title={`Linked to ${linkedLabel}`}>
              {isTransfer ? <ArrowRightLeft className="size-3" aria-hidden /> : null}
              {linkedLabel}
            </Chip>
          ) : null}
        </div>
      </button>
      <MoneyText
        pence={Math.abs(txn.amountPence)}
        className={cn("text-[14px]", isRefund ? "text-fern" : isTransfer ? "text-ink-muted" : "text-ink")}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="-mr-1 text-ink-muted"
            aria-label={`Actions for ${txn.description}`}
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
