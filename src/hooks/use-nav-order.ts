"use client";

import { useMemo } from "react";
import { NAV_ITEMS, type NavItem } from "@/components/shell/nav";
import { useLocalSetting } from "./use-local-setting";

/**
 * Sidebar order, per device (localStorage). Unknown hrefs are dropped and new
 * pages appear at the end, so upgrades never lose items.
 */
export function useNavOrder() {
  const [order, setOrder] = useLocalSetting<string[]>("nav-order", []);

  const items = useMemo<NavItem[]>(() => {
    const byHref = new Map(NAV_ITEMS.map((i) => [i.href, i]));
    const ordered = order.map((href) => byHref.get(href)).filter((i): i is NavItem => Boolean(i));
    const rest = NAV_ITEMS.filter((i) => !order.includes(i.href));
    return [...ordered, ...rest];
  }, [order]);

  return {
    items,
    customised: order.length > 0,
    setOrder: (hrefs: string[]) => setOrder(hrefs),
    reset: () => setOrder([]),
  };
}
