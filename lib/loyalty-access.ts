import { hasPermission } from "@/lib/permissions";

type LoyaltyUser = {
  roleName?: string | null;
  permissions?: string[];
};

export function canManageLoyalty(user?: LoyaltyUser | null) {
  return (
    user?.roleName === "System Admin" ||
    hasPermission(user?.permissions, "loyalty.manage")
  );
}

export function canAwardLoyalty(user?: LoyaltyUser | null) {
  return canManageLoyalty(user) || hasPermission(user?.permissions, "loyalty.award");
}

export function canViewLoyaltyCustomers(user?: LoyaltyUser | null) {
  return canManageLoyalty(user) || user?.roleName === "Manager";
}
