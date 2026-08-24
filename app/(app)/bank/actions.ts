"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageBank } from "@/lib/bank-access";
import { uploadReceipt } from "@/lib/blob";
import { toDateOnly } from "@/lib/dates";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

const bankExpenseSchema = z.object({
  id: z.string().optional(),
  businessDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(1, "Name is required").max(200),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(999_999_999),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type BankFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

async function requireBankManager() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;
  if (!canManageBank(session.user)) {
    return { error: "You don't have permission to manage bank records." } as const;
  }
  return { session } as const;
}

function collectFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] = issue.message;
  }
  return fieldErrors;
}

function revalidateBank() {
  revalidatePath("/bank");
  revalidatePath("/dashboard");
  revalidatePath("/monthly-report");
}

export async function upsertBankExpense(
  _prevState: BankFormState,
  formData: FormData
): Promise<BankFormState> {
  const guard = await requireBankManager();
  if ("error" in guard) return { error: guard.error };

  const id = formData.get("id");
  const isEdit = typeof id === "string" && id.length > 0;
  const parsed = bankExpenseSchema.safeParse({
    id: isEdit ? id : undefined,
    businessDate: formData.get("businessDate"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    remarks: formData.get("remarks") ?? "",
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  if (isEdit) {
    const existing = await db.bankEntry.findUnique({ where: { id: parsed.data.id! } });
    if (!existing || existing.entryType !== "bank_expense") {
      return { error: "Bank expense not found." };
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
    try {
      receiptUrl = await uploadReceipt(receipt);
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Receipt upload failed. Please try another file.",
      };
    }
  }

  const data = {
    entryType: "bank_expense",
    businessDate: toDateOnly(parsed.data.businessDate),
    name: parsed.data.name,
    amount: -Math.abs(parsed.data.amount),
    remarks: parsed.data.remarks || null,
    ...(receiptUrl ? { receiptUrl } : {}),
  };

  if (isEdit) {
    await db.bankEntry.update({ where: { id: parsed.data.id! }, data });
  } else {
    await db.bankEntry.create({
      data: { ...data, createdById: guard.session.user.id },
    });
  }

  revalidateBank();
  return { success: isEdit ? "Bank expense updated." : "Bank expense added." };
}

export async function deleteBankExpense(id: string): Promise<{ error?: string }> {
  const guard = await requireBankManager();
  if ("error" in guard) return { error: guard.error };

  const existing = await db.bankEntry.findUnique({ where: { id } });
  if (!existing || existing.entryType !== "bank_expense") {
    return { error: "Bank expense not found." };
  }

  await db.bankEntry.delete({ where: { id } });
  revalidateBank();
  return {};
}