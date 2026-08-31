"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { QuickAddProvider, useQuickAdd } from "@/components/domain/quick-add-context";
import { QuickAddSheet } from "@/components/domain/quick-add-sheet";
import { Button } from "@/components/ui/button";
import { type HouseholdInitial, HouseholdProvider, useHousehold } from "@/store/household-store";
import { BottomTabs } from "./bottom-tabs";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";

function MobileTopBar() {
  const { household } = useHousehold();
  const brand = household.name.trim() || "Daybook";
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-hairline bg-paper/90 px-4 backdrop-blur md:hidden">
      <Link href="/dashboard" className="display min-w-0 truncate text-[18px] leading-none text-navy">
        {brand}
      </Link>
      <UserMenu compact />
    </header>
  );
}

function DesktopQuickAdd() {
  const { open } = useQuickAdd();
  return (
    <Button
      onClick={() => open()}
      className="fixed right-8 bottom-8 z-30 hidden h-11 rounded-full px-4 shadow-[0_8px_20px_rgb(68_114_196/0.35)] md:inline-flex"
    >
      <Plus /> Log spending
    </Button>
  );
}

export function AppShell({ initial, children }: { initial: HouseholdInitial; children: ReactNode }) {
  return (
    <HouseholdProvider initial={initial}>
      <QuickAddProvider>
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileTopBar />
            <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-24">
              {children}
            </main>
          </div>
        </div>
        <BottomTabs />
        <DesktopQuickAdd />
        <QuickAddSheet />
      </QuickAddProvider>
    </HouseholdProvider>
  );
}
