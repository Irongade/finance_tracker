"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDate } from "@/domain/dates";
import { cn } from "@/lib/utils";
import { useHousehold } from "@/store/household-store";
import { isActive, NAV_ITEMS } from "./nav";
import { UserMenu } from "./user-menu";

export function Sidebar() {
  const pathname = usePathname();
  const { clock, household } = useHousehold();
  const brand = household.name.trim() || "Finance Tracker";
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-hairline bg-surface md:flex">
      <div className="px-5 pt-6 pb-4">
        <Link href="/" className="display block truncate text-[22px] leading-none text-navy" title={brand}>
          {brand}
        </Link>
        <p className="mt-1 text-[11.5px] text-ink-muted">Household ledger</p>
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium text-ink-muted transition-colors hover:bg-row-hover hover:text-navy focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active && "bg-navy/8 text-navy",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-navy" : "text-ink-muted")} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-hairline p-3">
        <UserMenu />
        <p className="mt-2 px-2.5 text-[11px] text-ink-muted">Today is {formatDate(clock.today)}</p>
      </div>
    </aside>
  );
}
