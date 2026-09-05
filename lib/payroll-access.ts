import { hasPermission } from "@/lib/permissions";

type PayrollSessionUser = {
  roleName?: string;
  permissions?: string[];
};

function isPayrollViewerRole(user: PayrollSessionUser | undefined) {
  return user?.roleName === "System Admin" || user?.roleName === "Manager";
}

export function canViewPayroll(user: PayrollSessionUser | undefined) {
  return hasPermission(user?.permissions, "payroll.view") || isPayrollViewerRole(user);
}

export function canManagePayroll(user: PayrollSessionUser | undefined) {
  return hasPermission(user?.permissions, "payroll.manage") || user?.roleName === "System Admin";
}