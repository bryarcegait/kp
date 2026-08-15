"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInputDate, toDateOnly } from "@/lib/dates";
import { canManageCashSummary } from "@/lib/cash-summary-access";
import { saveLoyverseDailyReport } from "@/lib/loyverse";

const cashSummarySchema = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startingAmount: z.coerce.number().min(0, "Starting amount cannot be negative"),
  cashOnHand: z.coerce.number().min(0, "Cash on hand cannot be negative"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CashSummaryFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function upsertCashSummary(
  _prevState: CashSummaryFormState,
  formData: FormData
): Promise<CashSummaryFormState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };

  if (!canManageCashSummary(session.user)) {
    return { error: "You don't have permission to update cash summaries." };
  }

  const adjustmentNames = formData.getAll("adjustmentName");
  const adjustmentAmounts = formData.getAll("adjustmentAmount");
  const adjustmentItems = adjustmentNames
    .map((rawName, index) => ({
      name: String(rawName ?? "").trim(),
      amount: Number(adjustmentAmounts[index] ?? 0),
    }))
    .filter((item) => item.name || item.amount);

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

  const adjustmentTotal = adjustmentItems.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const parsed = cashSummarySchema.safeParse({
    businessDate: parseInputDate(formData.get("businessDate")),
    startingAmount: formData.get("startingAmount"),
    cashOnHand: formData.get("cashOnHand"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }

  const businessDate = toDateOnly(parsed.data.businessDate);

  await db.$transaction(async (tx) => {
    const summary = await tx.dailyCashSummary.upsert({
      where: { businessDate },
      update: {
        startingAmount: parsed.data.startingAmount,
        adjustments: adjustmentTotal,
        cashOnHand: parsed.data.cashOnHand,
        notes: parsed.data.notes || null,
        updatedById: session.user.id,
      },
      create: {
        businessDate,
        startingAmount: parsed.data.startingAmount,
        adjustments: adjustmentTotal,
        cashOnHand: parsed.data.cashOnHand,
        notes: parsed.data.notes || null,
        createdById: session.user.id,
        updatedById: session.user.id,
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

  revalidatePath("/");
  revalidatePath("/cash-summary");
  return {};
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
    revalidatePath("/");
    revalidatePath("/cash-summary");
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
