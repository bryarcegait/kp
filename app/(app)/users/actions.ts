"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInputDate, toDateOnly } from "@/lib/dates";
import { hasPermission } from "@/lib/permissions";

const userSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(1, "Full name is required").max(150),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Only letters, numbers, dots, dashes and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  roleId: z.string().min(1, "Role is required"),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Birthday must be a valid date")
    .optional()
    .or(z.literal("")),
  dateHired: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date hired must be a valid date")
    .optional()
    .or(z.literal("")),
});

export type UserFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function requireUserManager() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;
  if (!hasPermission(session.user.permissions, "users.manage")) {
    return { error: "You don't have permission to manage users." } as const;
  }
  return { session } as const;
}

function dateOrNull(value: string | undefined) {
  if (!value) return null;
  return toDateOnly(parseInputDate(value));
}

function createTemporaryPassword() {
  return `kp${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function upsertUser(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const guard = await requireUserManager();
  if ("error" in guard) return { error: guard.error };

  const id = formData.get("id");
  const isEdit = typeof id === "string" && id.length > 0;

  const parsed = userSchema.safeParse({
    id: isEdit ? id : undefined,
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    password: formData.get("password") ?? "",
    roleId: formData.get("roleId"),
    birthday: formData.get("birthday") ?? "",
    dateHired: formData.get("dateHired") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }

  if (!isEdit && !parsed.data.password) {
    return { error: "Please fix the errors below.", fieldErrors: { password: "Password is required" } };
  }

  const existingUsername = await db.user.findUnique({ where: { username: parsed.data.username } });
  if (existingUsername && existingUsername.id !== parsed.data.id) {
    return { error: "Please fix the errors below.", fieldErrors: { username: "Username is already taken" } };
  }

  const isActive = formData.get("isActive") === "true";

  if (isEdit) {
    await db.user.update({
      where: { id: parsed.data.id! },
      data: {
        fullName: parsed.data.fullName,
        username: parsed.data.username,
        roleId: parsed.data.roleId,
        birthday: dateOrNull(parsed.data.birthday),
        dateHired: dateOrNull(parsed.data.dateHired),
        isActive,
        ...(parsed.data.password
          ? {
              passwordHash: await bcrypt.hash(parsed.data.password, 10),
              mustChangePassword: true,
            }
          : {}),
      },
    });
  } else {
    await db.user.create({
      data: {
        fullName: parsed.data.fullName,
        username: parsed.data.username,
        roleId: parsed.data.roleId,
        birthday: dateOrNull(parsed.data.birthday),
        dateHired: dateOrNull(parsed.data.dateHired),
        isActive: true,
        passwordHash: await bcrypt.hash(parsed.data.password!, 10),
        mustChangePassword: true,
      },
    });
  }

  revalidatePath("/users");
  return {};
}

export async function setUserActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const guard = await requireUserManager();
  if ("error" in guard) return { error: guard.error };

  if (guard.session.user.id === id && !isActive) {
    return { error: "You can't deactivate your own account." };
  }

  await db.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/users");
  return {};
}

export async function resetUserPassword(
  id: string
): Promise<{ error?: string; tempPassword?: string }> {
  const guard = await requireUserManager();
  if ("error" in guard) return { error: guard.error };

  const tempPassword = createTemporaryPassword();

  await db.user.update({
    where: { id },
    data: {
      passwordHash: await bcrypt.hash(tempPassword, 10),
      mustChangePassword: true,
    },
  });

  revalidatePath("/users");
  return { tempPassword };
}
