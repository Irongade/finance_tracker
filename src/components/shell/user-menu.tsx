"use client";

import { LogOut, RotateCcw, UserRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PersonBadge } from "@/components/domain/person-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useHousehold } from "@/mock/store";

/** Mock session: switch between the two household members, reset the demo data. */
export function UserMenu({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { users, currentUserId, setCurrentUserId, dispatch } = useHousehold();
  const me = users.find((u) => u.id === currentUserId) ?? users[0];
  const other = users.find((u) => u.id !== currentUserId) ?? users[1];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "default"}
          className={cn(compact ? "rounded-full" : "h-11 w-full justify-start gap-2.5 px-2.5", className)}
          aria-label="Account menu"
        >
          <PersonBadge owner={{ kind: "user", userId: me.id }} users={users} size={compact ? "md" : "md"} />
          {!compact ? (
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="truncate text-[13px] font-semibold text-ink">{me.name}</span>
              <span className="truncate text-[11.5px] text-ink-muted">{me.email}</span>
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[12px] font-normal text-ink-muted">Signed in as {me.name}</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => {
            setCurrentUserId(other.id);
            toast(`Now viewing as ${other.name}`, { description: "Demo only. Real accounts sign in separately." });
          }}
        >
          <UserRound /> Switch to {other.name} (demo)
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            dispatch({ type: "reset" });
            toast("Demo data reset", { description: "Back to the workbook's August 2026 figures." });
          }}
        >
          <RotateCcw /> Reset demo data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login">
            <LogOut /> Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
