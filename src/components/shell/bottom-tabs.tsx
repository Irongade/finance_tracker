"use client";

import { Ellipsis, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuickAdd } from "@/components/domain/quick-add-context";
import { cn } from "@/lib/utils";
import { isActive, MOBILE_PRIMARY, MORE_ITEMS, NAV_ITEMS } from "./nav";

/** Section 7.3: Dashboard, Transactions, big central +, Goals, More. */
export function BottomTabs() {
  const pathname = usePathname();
  const { open } = useQuickAdd();
  const primary = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.href));
  const moreActive = pathname === "/more" || MORE_ITEMS.some((i) => isActive(pathname, i.href));

  const tab = (href: string, label: string, Icon: React.ComponentType<{ className?: string }>, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-ink-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "text-navy",
      )}
    >
      <Icon className={cn("size-5", active ? "text-navy" : "text-ink-muted")} />
      {label}
    </Link>
  );

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="flex h-14 items-stretch">
        {tab(primary[0].href, primary[0].label, primary[0].icon, isActive(pathname, primary[0].href))}
        {tab(primary[1].href, primary[1].label, primary[1].icon, isActive(pathname, primary[1].href))}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => open()}
            aria-label="Log spending"
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-blue text-white shadow-[0_8px_20px_rgb(68_114_196/0.35)] transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus className="size-7" />
          </button>
        </div>
        {tab(primary[2].href, primary[2].label, primary[2].icon, isActive(pathname, primary[2].href))}
        {tab("/more", "More", Ellipsis, moreActive)}
      </div>
    </nav>
  );
}
