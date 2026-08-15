import { hasPermission } from "@/lib/permissions";

type CashSummarySessionUser = {
  roleName?: string;
  permissions?: string[];
};

function isCashSummaryRole(roleName: string | undefined) {
  return roleName === "System Admin" || roleName === "Manager";
}

export function canViewCashSummary(user: CashSummarySessionUser | undefined) {
  return (
    hasPermission(user?.permissions, "cash_summary.view") ||
    isCashSummaryRole(user?.roleName)
  );
}

export function canManageCashSummary(user: CashSummarySessionUser | undefined) {
  return (
    hasPermission(user?.permissions, "cash_summary.manage") ||
    isCashSummaryRole(user?.roleName)
  );
}
