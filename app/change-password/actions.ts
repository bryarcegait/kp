"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";

const changePasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      mustChangePassword: false,
    },
  });

  await signOut({ redirectTo: "/login?changed=1" });
  return {};
}
