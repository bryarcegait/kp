import type { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  Receipt,
  Users,
  ShieldCheck,
  Calculator,
  CalendarCheck,
  CalendarDays,
  Landmark,
  Gift,
  ChartNoAxesCombined,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey;
};

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "Cash Summary",
    href: "/cash-summary",
    icon: Calculator,
    permission: "cash_summary.view",
  },
  { title: "Expenses", href: "/expenses", icon: Receipt, permission: "expenses.view" },
  { title: "Bank", href: "/bank", icon: Landmark, permission: "bank.view" },
  {
    title: "Monthly Report",
    href: "/monthly-report",
    icon: ChartNoAxesCombined,
  },
  { title: "Loyalty", href: "/loyalty", icon: Gift, permission: "loyalty.manage" },
  { title: "My Calendar", href: "/my-calendar", icon: CalendarCheck },
  {
    title: "Schedule",
    href: "/schedule",
    icon: CalendarDays,
    permission: "schedule.view",
  },
  { title: "Menu", href: "/menu", icon: Utensils, permission: "menu.manage" },
  { title: "Users", href: "/users", icon: Users, permission: "users.view" },
  { title: "Roles", href: "/roles", icon: ShieldCheck, permission: "roles.view" },
];
