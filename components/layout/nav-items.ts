import type { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  Receipt,
  Users,
  ShieldCheck,
  ChartColumn,
  Calculator,
  CalendarCheck,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey;
};

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Expenses", href: "/expenses", icon: Receipt, permission: "expenses.view" },
  { title: "POS Reports", href: "/pos-reports", icon: ChartColumn },
  {
    title: "Schedule",
    href: "/schedule",
    icon: CalendarDays,
    permission: "schedule.view",
  },
  { title: "My Calendar", href: "/my-calendar", icon: CalendarCheck },
  {
    title: "Cash Summary",
    href: "/cash-summary",
    icon: Calculator,
    permission: "cash_summary.view",
  },
  { title: "Users", href: "/users", icon: Users, permission: "users.view" },
  { title: "Roles", href: "/roles", icon: ShieldCheck, permission: "roles.view" },
];
