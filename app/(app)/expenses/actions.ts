"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { uploadReceipt } from "@/lib/blob";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

const expenseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required").max(200),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(999_999_999),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ExpenseFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function upsertExpense(
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };

  const permissions = session.user.permissions;
  const id = formData.get("id");
  const isEdit = typeof id === "string" && id.length > 0;

  if (isEdit && !hasPermission(permissions, "expenses.edit")) {
    return { error: "You don't have permission to edit expenses." };
  }
  if (!isEdit && !hasPermission(permissions, "expenses.create")) {
    return { error: "You don't have permission to add expenses." };
  }

  const parsed = expenseSchema.safeParse({
    id: isEdit ? id : undefined,
    name: formData.get("name"),
    amount: formData.get("amount"),
    remarks: formData.get("remarks") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }

  if (isEdit && !hasPermission(permissions, "expenses.view_all")) {
    const existing = await db.expense.findUnique({ where: { id: parsed.data.id! } });
    if (!existing || existing.createdById !== session.user.id) {
      return { error: "You can only edit your own expenses." };
    }
  }

  let receiptUrl: string | undefined;
  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return { error: "Receipt file is too large (max 5MB)." };
    }
    if (!ALLOWED_RECEIPT_TYPES.includes(receipt.type)) {
      return { error: "Receipt must be an image (PNG/JPG/WebP) or PDF." };
    }
    receiptUrl = await uploadReceipt(receipt);
  }

  const data = {
    name: parsed.data.name,
    amount: parsed.data.amount,
    remarks: parsed.data.remarks || null,
    ...(receiptUrl ? { receiptUrl } : {}),
  };

  if (isEdit) {
    await db.expense.update({ where: { id: parsed.data.id! }, data });
  } else {
    await db.expense.create({
      data: { ...data, createdById: session.user.id },
    });
  }

  revalidatePath("/expenses");
  revalidatePath("/");
  return {};
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };
  if (!hasPermission(session.user.permissions, "expenses.delete")) {
    return { error: "You don't have permission to delete expenses." };
  }

  await db.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  revalidatePath("/");
  return {};
}
