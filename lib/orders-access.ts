import { hasPermission } from "@/lib/permissions";

type OrdersUser = {
  roleName?: string | null;
  permissions?: string[];
};

export function canManageOrders(user?: OrdersUser | null) {
  return (
    user?.roleName === "System Admin" ||
    user?.roleName === "Manager" ||
    hasPermission(user?.permissions, "orders.manage")
  );
}
