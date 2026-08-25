"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addInputDateDays, parseInputDate, toDateOnly } from "@/lib/dates";
import { canManageCashSummary } from "@/lib/cash-summary-access";
import { saveLoyverseDailyReport } from "@/lib/loyverse";

const shiftStartSchema = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startingAmount: z.coerce.number().min(0, "Opening cash cannot be negative"),
});

const shiftEndSchema = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cashOnHand: z.coerce.number().min(0, "Cash on hand cannot be negative"),
  openingCashForTomorrow: z.coerce
    .number()
    .min(0, "Opening cash for tomorrow cannot be negative"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CashSummaryFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

async function requireCashSummaryManager() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;

  if (!canManageCashSummary(session.user)) {
    return { error: "You don't have permission to update cash summaries." } as const;
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

function collectAdjustmentItems(formData: FormData) {
  const adjustmentNames = formData.getAll("adjustmentName");
  const adjustmentAmounts = formData.getAll("adjustmentAmount");
  return adjustmentNames
    .map((rawName, index) => ({
      name: String(rawName ?? "").trim(),
      amount: Number(adjustmentAmounts[index] ?? 0),
    }))
    .filter((item) => item.name || item.amount);
}

function revalidateCashSummary() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/cash-summary");
  revalidatePath("/bank");
  revalidatePath("/monthly-report");
}

export async function saveShiftStart(
  _prevState: CashSummaryFormState,
  formData: FormData
): Promise<CashSummaryFormState> {
  const guard = await requireCashSummaryManager();
  if ("error" in guard) return { error: guard.error };

  const adjustmentItems = collectAdjustmentItems(formData);
  for (const [index, item] of adjustmentItems.entries()) {
    if (!item.name) {
      return {
        error: "Please add a name for each adjustment.",
        fieldErrors: { adjustments: `Adjustment ${index + 1} needs a name.` },
      };
    }

    if (!Number.isFinite(item.amount) || item.amount <= 0) {
      return {
        error: "Please enter a valid amount for each adjustment.",
        fieldErrors: {
          adjustments: `Adjustment ${index + 1} needs an amount above zero.`,
        },
      };
    }
  }

  const parsed = shiftStartSchema.safeParse({
    businessDate: parseInputDate(formData.get("businessDate")),
    startingAmount: formData.get("startingAmount"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const businessDate = toDateOnly(parsed.data.businessDate);
  const adjustmentTotal = adjustmentItems.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  await db.$transaction(async (tx) => {
    const summary = await tx.dailyCashSummary.upsert({
      where: { businessDate },
      update: {
        startingAmount: parsed.data.startingAmount,
        adjustments: adjustmentTotal,
        updatedById: guard.session.user.id,
      },
      create: {
        businessDate,
        startingAmount: parsed.data.startingAmount,
        adjustments: adjustmentTotal,
        cashOnHand: 0,
        openingCashForTomorrow: 0,
        createdById: guard.session.user.id,
        updatedById: guard.session.user.id,
      },
    });

    await tx.dailyCashAdjustment.deleteMany({
      where: { summaryId: summary.id },
    });

    if (adjustmentItems.length > 0) {
      await tx.dailyCashAdjustment.createMany({
        data: adjustmentItems.map((item) => ({
          summaryId: summary.id,
          name: item.name,
          amount: item.amount,
        })),
      });
    }
  });

  revalidateCashSummary();
  return { success: "Shift start saved." };
}

export async function saveShiftEnd(
  _prevState: CashSummaryFormState,
  formData: FormData
): Promise<CashSummaryFormState> {
  const guard = await requireCashSummaryManager();
  if ("error" in guard) return { error: guard.error };

  const parsed = shiftEndSchema.safeParse({
    businessDate: parseInputDate(formData.get("businessDate")),
    cashOnHand: formData.get("cashOnHand"),
    openingCashForTomorrow: formData.get("openingCashForTomorrow"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const businessDateInput = parsed.data.businessDate;
  const businessDate = toDateOnly(businessDateInput);
  const tomorrowDate = toDateOnly(addInputDateDays(businessDateInput, 1));
  const bankTransferAmount =
    parsed.data.cashOnHand - parsed.data.openingCashForTomorrow;

  await db.$transaction(async (tx) => {
    await tx.dailyCashSummary.upsert({
      where: { businessDate },
      update: {
        cashOnHand: parsed.data.cashOnHand,
        openingCashForTomorrow: parsed.data.openingCashForTomorrow,
        notes: parsed.data.notes || null,
        updatedById: guard.session.user.id,
      },
      create: {
        businessDate,
        startingAmount: 0,
        adjustments: 0,
        cashOnHand: parsed.data.cashOnHand,
        openingCashForTomorrow: parsed.data.openingCashForTomorrow,
        notes: parsed.data.notes || null,
        createdById: guard.session.user.id,
        updatedById: guard.session.user.id,
      },
    });

    await tx.dailyCashSummary.upsert({
      where: { businessDate: tomorrowDate },
      update: {
        startingAmount: parsed.data.openingCashForTomorrow,
        updatedById: guard.session.user.id,
      },
      create: {
        businessDate: tomorrowDate,
        startingAmount: parsed.data.openingCashForTomorrow,
        adjustments: 0,
        cashOnHand: 0,
        openingCashForTomorrow: 0,
        createdById: guard.session.user.id,
        updatedById: guard.session.user.id,
      },
    });

    const existingTransfer = await tx.bankEntry.findFirst({
      where: { entryType: "cash_transfer", businessDate },
    });

    if (bankTransferAmount > 0) {
      const transferData = {
        name: "Cash added to Bank",
        amount: bankTransferAmount,
        remarks: `Cash on hand ${parsed.data.cashOnHand.toFixed(2)} minus opening cash for tomorrow ${parsed.data.openingCashForTomorrow.toFixed(2)}.`,
        createdById: guard.session.user.id,
      };

      if (existingTransfer) {
        await tx.bankEntry.update({
          where: { id: existingTransfer.id },
          data: transferData,
        });
      } else {
        await tx.bankEntry.create({
          data: {
            entryType: "cash_transfer",
            businessDate,
            ...transferData,
          },
        });
      }
    } else if (existingTransfer) {
      await tx.bankEntry.delete({ where: { id: existingTransfer.id } });
    }
  });

  revalidateCashSummary();
  return { success: "Shift end saved." };
}

export async function syncPosReport(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };

  if (!canManageCashSummary(session.user)) {
    return { error: "You don't have permission to sync POS data." };
  }

  const businessDate = parseInputDate(formData.get("businessDate"));

  try {
    await saveLoyverseDailyReport(businessDate);
    revalidateCashSummary();
    revalidatePath("/pos-reports");
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to sync Loyverse POS data.",
    };
  }
}
