import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateOnly } from "@/lib/dates";
import { hasPermission } from "@/lib/permissions";
import { UsersClient, type UserRow } from "@/components/users/users-client";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!hasPermission(session.user.permissions, "users.view")) redirect("/");

  const canManage = hasPermission(session.user.permissions, "users.manage");

  const [users, roles] = await Promise.all([
    db.user.findMany({ include: { role: true }, orderBy: { createdAt: "asc" } }),
    db.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    username: u.username,
    birthday: u.birthday ? formatDateOnly(u.birthday) : null,
    dateHired: u.dateHired ? formatDateOnly(u.dateHired) : null,
    roleId: u.roleId,
    roleName: u.role.name,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage who can access the system and their role.</p>
      </div>
      {canManage ? (
        <UsersClient users={rows} roles={roles} currentUserId={session.user.id} />
      ) : (
        <p className="text-muted-foreground">You don&apos;t have permission to manage users.</p>
      )}
    </div>
  );
}
