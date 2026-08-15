"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

const roleSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export type RoleFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function requireRoleManager() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;
  if (!hasPermission(session.user.permissions, "roles.manage")) {
    return { error: "You don't have permission to manage roles." } as const;
  }
  return { session } as const;
}

export async function upsertRole(
  _prevState: RoleFormState,
  formData: FormData
): Promise<RoleFormState> {
  const guard = await requireRoleManager();
  if ("error" in guard) return { error: guard.error };

  const id = formData.get("id");
  const isEdit = typeof id === "string" && id.length > 0;

  const parsed = roleSchema.safeParse({
    id: isEdit ? id : undefined,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }

  const existingName = await db.role.findUnique({ where: { name: parsed.data.name } });
  if (existingName && existingName.id !== parsed.data.id) {
    return { error: "Please fix the errors below.", fieldErrors: { name: "A role with this name already exists" } };
  }

  const permissionKeys = formData.getAll("permissions").map(String);
  const permissions = await db.permission.findMany({ where: { key: { in: permissionKeys } } });

  const role = isEdit
    ? await db.role.update({
        where: { id: parsed.data.id! },
        data: { name: parsed.data.name, description: parsed.data.description || null },
      })
    : await db.role.create({
        data: { name: parsed.data.name, description: parsed.data.description || null },
      });

  await db.rolePermission.deleteMany({ where: { roleId: role.id } });
  await db.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
  });

  revalidatePath("/roles");
  return {};
}

export async function deleteRole(id: string): Promise<{ error?: string }> {
  const guard = await requireRoleManager();
  if ("error" in guard) return { error: guard.error };

  const role = await db.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) return { error: "Role not found." };
  if (role.isSystem) return { error: "Built-in roles can't be deleted." };
  if (role._count.users > 0) {
    return { error: `${role._count.users} user(s) still have this role. Reassign them first.` };
  }

  await db.rolePermission.deleteMany({ where: { roleId: id } });
  await db.role.delete({ where: { id } });
  revalidatePath("/roles");
  return {};
}
