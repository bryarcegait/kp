"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageBank, canSetBankCurrentAmount } from "@/lib/bank-access";
import { uploadReceipt } from "@/lib/blob";
import { addInputDateDays, parseInputDate, toDateOnly } from "@/lib/dates";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

const bankBalanceSchema = z.object({
  currentAmount: z.coerce.number().min(0, "Current bank amount cannot be negative").max(999_999_999),
});

const bankDateSchema = z.object({
  businessDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
});

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

async function requireBankSystemAdmin() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;
  if (!canSetBankCurrentAmount(session.user)) {
    return { error: "Only System Admin can set the current bank amount." } as const;
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
}

function getTodayInputDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function getCurrentBankBalance() {
  const result = await db.bankEntry.aggregate({ _sum: { amount: true } });
  return Number(result._sum.amount ?? 0);
}

export async function setBankCurrentAmount(
  _prevState: BankFormState,
  formData: FormData
): Promise<BankFormState> {
  const guard = await requireBankSystemAdmin();
  if ("error" in guard) return { error: guard.error };

  const parsed = bankBalanceSchema.safeParse({
    currentAmount: formData.get("currentAmount"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const currentBalance = await getCurrentBankBalance();
  const targetBalance = parsed.data.currentAmount;
  const adjustment = targetBalance - currentBalance;

  if (Math.abs(adjustment) < 0.005) {
    return { success: "Bank amount is already up to date." };
  }

  await db.bankEntry.create({
    data: {
      entryType: "balance_adjustment",
      name: "Current bank value set",
      amount: adjustment,
      remarks: `Adjusted bank value to ${targetBalance.toFixed(2)}.`,
      createdById: guard.session.user.id,
    },
  });

  revalidateBank();
  return { success: "Current bank amount saved." };
}

export async function recordDailyCashTransfer(
  _prevState: BankFormState,
  formData: FormData
): Promise<BankFormState> {
  const guard = await requireBankManager();
  if ("error" in guard) return { error: guard.error };

  const parsed = bankDateSchema.safeParse({
    businessDate: formData.get("businessDate"),
  });

  if (!parsed.success) {
    return { error: "Please choose a valid business date." };
  }

  const businessDateInput = parseInputDate(parsed.data.businessDate);
  if (businessDateInput <= getTodayInputDate()) {
    return {
      error:
        "Bank transfer recording starts tomorrow. Use today's cash on hand as tomorrow's transfer basis.",
    };
  }

  const businessDate = toDateOnly(businessDateInput);
  const yesterdayDate = toDateOnly(addInputDateDays(businessDateInput, -1));

  const [todaySummary, yesterdaySummary] = await Promise.all([
    db.dailyCashSummary.findUnique({ where: { businessDate } }),
    db.dailyCashSummary.findUnique({ where: { businessDate: yesterdayDate } }),
  ]);

  const yesterdayCashOnHand = Number(yesterdaySummary?.cashOnHand ?? 0);
  const todayStartingAmount = Number(todaySummary?.startingAmount ?? 0);
  const transferAmount = yesterdayCashOnHand - todayStartingAmount;

  if (transferAmount <= 0) {
    return {
      error:
        "No bank transfer to record. Yesterday cash on hand must be higher than today's starting cash.",
    };
  }

  const existing = await db.bankEntry.findFirst({
    where: { entryType: "cash_transfer", businessDate },
  });

  const data = {
    entryType: "cash_transfer",
    businessDate,
    name: "Cash transferred from drawer",
    amount: transferAmount,
    remarks: `Yesterday cash on hand ${yesterdayCashOnHand.toFixed(2)} minus today's starting cash ${todayStartingAmount.toFixed(2)}.`,
    createdById: guard.session.user.id,
  };

  if (existing) {
    await db.bankEntry.update({
      where: { id: existing.id },
      data: {
        amount: data.amount,
        remarks: data.remarks,
        createdById: data.createdById,
      },
    });
  } else {
    await db.bankEntry.create({ data });
  }

  revalidateBank();
  return { success: "Cash transfer recorded in bank." };
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
