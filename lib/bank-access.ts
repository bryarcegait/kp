import { hasPermission } from "@/lib/permissions";

type BankSessionUser = {
  roleName?: string;
  permissions?: string[];
};

function isBankRole(roleName: string | undefined) {
  return roleName === "System Admin" || roleName === "Manager";
}

export function canViewBank(user: BankSessionUser | undefined) {
  return hasPermission(user?.permissions, "bank.view") || isBankRole(user?.roleName);
}

export function canManageBank(user: BankSessionUser | undefined) {
  return hasPermission(user?.permissions, "bank.manage") || isBankRole(user?.roleName);
}
