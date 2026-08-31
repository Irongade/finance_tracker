import {
  BookOpen,
  CalendarCheck,
  ChartColumn,
  ChartLine,
  CreditCard,
  Grid3x3,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  PiggyBank,
  ReceiptText,
  Settings,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Section 7.3: the same items ungrouped on desktop; primary four + More on mobile. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/bills", label: "Bills", icon: CalendarCheck },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/my-money", label: "My Money", icon: Wallet },
  { href: "/budgets", label: "Budgets", icon: Grid3x3 },
  { href: "/pots", label: "Pots", icon: PiggyBank },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/metrics", label: "Metrics", icon: ChartColumn },
  { href: "/forecast", label: "Forecast", icon: ChartLine },
  { href: "/debts", label: "Debts", icon: CreditCard },
  { href: "/net-worth", label: "Net Worth", icon: Landmark },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: BookOpen },
];

export const MOBILE_PRIMARY = ["/dashboard", "/transactions", "/goals"];

export const MORE_ITEMS = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href));

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
