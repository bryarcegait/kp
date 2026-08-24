// Central catalog of permissions. Adding a new module later just means
// appending entries here and re-running the seed script.

export const PERMISSIONS = [
  { key: "expenses.view", label: "View own expenses", module: "Expenses" },
  { key: "expenses.view_all", label: "View everyone's expenses", module: "Expenses" },
  { key: "expenses.create", label: "Add expenses", module: "Expenses" },
  { key: "expenses.edit", label: "Edit expenses", module: "Expenses" },
  { key: "expenses.delete", label: "Delete expenses", module: "Expenses" },
  { key: "cash_summary.view", label: "View daily cash closeout", module: "Daily Cash Closeout" },
  { key: "cash_summary.manage", label: "Update daily cash closeout", module: "Daily Cash Closeout" },
  { key: "bank.view", label: "View bank ledger", module: "Bank" },
  { key: "bank.manage", label: "Update bank ledger", module: "Bank" },
  { key: "loyalty.manage", label: "Manage loyalty cards", module: "Loyalty" },
  { key: "menu.manage", label: "Manage restaurant menu", module: "Menu" },
  { key: "schedule.view", label: "View employee schedule", module: "Schedule" },
  { key: "schedule.manage", label: "Update employee schedule", module: "Schedule" },
  { key: "users.view", label: "View users", module: "Users" },
  { key: "users.manage", label: "Create / edit / deactivate users", module: "Users" },
  { key: "roles.view", label: "View roles", module: "Roles" },
  { key: "roles.manage", label: "Create / edit roles & permissions", module: "Roles" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_MODULES = Array.from(
  new Set(PERMISSIONS.map((p) => p.module))
);

export function hasPermission(
  userPermissions: readonly string[] | undefined,
  key: PermissionKey
): boolean {
  return !!userPermissions?.includes(key);
}

export function hasAnyPermission(
  userPermissions: readonly string[] | undefined,
  keys: readonly PermissionKey[]
): boolean {
  return keys.some((key) => hasPermission(userPermissions, key));
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  "System Admin": PERMISSIONS.map((p) => p.key),
  Manager: [
    "expenses.view",
    "expenses.view_all",
    "expenses.create",
    "expenses.edit",
    "cash_summary.view",
    "cash_summary.manage",
    "bank.view",
    "bank.manage",
    "menu.manage",
    "schedule.view",
    "schedule.manage",
    "users.view",
  ],
  Staff: ["expenses.view", "expenses.create", "schedule.view"],
};
