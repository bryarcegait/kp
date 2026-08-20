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
