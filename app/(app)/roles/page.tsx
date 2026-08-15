import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { RolesClient, type RoleRow } from "@/components/roles/roles-client";

export default async function RolesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!hasPermission(session.user.permissions, "roles.view")) redirect("/");

  const canManage = hasPermission(session.user.permissions, "roles.manage");

  const roles = await db.role.findMany({
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissionKeys: r.permissions.map((rp) => rp.permission.key),
    userCount: r._count.users,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground">
          Control what each role can see and do across the system.
        </p>
      </div>
      {canManage ? (
        <RolesClient roles={rows} />
      ) : (
        <p className="text-muted-foreground">You don&apos;t have permission to manage roles.</p>
      )}
    </div>
  );
}
