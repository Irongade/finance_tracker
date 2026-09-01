"use client";

import { LogOut, RefreshCw, SunMoon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { PersonBadge } from "@/components/domain/person-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useHousehold } from "@/store/household-store";

export function UserMenu({ compact = false, className }: { compact?: boolean; className?: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { users, currentUserId, refresh, saving } = useHousehold();
  const me = users.find((u) => u.id === currentUserId) ?? users[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "default"}
          className={cn(
            compact ? "rounded-full" : "h-11 w-full min-w-0 justify-start gap-2.5 overflow-hidden px-2.5",
            className,
          )}
          aria-label="Account menu"
        >
          <PersonBadge owner={{ kind: "user", userId: me.id }} users={users} size="md" />
          {!compact ? (
            <span className="flex w-full min-w-0 flex-col items-start leading-tight">
              <span className="max-w-full truncate text-[13px] font-semibold text-ink">{me.name}</span>
              <span className="max-w-full truncate text-[11.5px] text-ink-muted">
                {saving ? "Saving…" : (me.email ?? "")}
              </span>
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[12px] font-normal text-ink-muted">
          Signed in as {me.email ?? me.name}
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => {
            void refresh().then(() => toast("Up to date"));
          }}
        >
          <RefreshCw /> Refresh
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SunMoon className="text-muted-foreground" /> Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await authClient.signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
