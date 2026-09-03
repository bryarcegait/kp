import { hasPermission } from "@/lib/permissions";

type GcashSessionUser = {
  roleName?: string;
  permissions?: string[];
};

export function canManageGcash(user: GcashSessionUser | undefined) {
  return hasPermission(user?.permissions, "gcash.manage") || user?.roleName === "System Admin";
}
