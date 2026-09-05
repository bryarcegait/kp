"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDateOnly } from "@/lib/dates";
import { canManagePayroll } from "@/lib/payroll-access";
import { getPayWeekStart } from "@/lib/payroll-earnings";

export type PayrollAdvanceFormState = {
  success?: string;
  error?: string;
};

export async function recordPayrollAdvance(
  _prevState: PayrollAdvanceFormState,
  formData: FormData
): Promise<PayrollAdvanceFormState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };
  if (!canManagePayroll(session.user)) {
    return { error: "You don't have permission to record payroll advances." };
  }

  const userId = formData.get("userId");
  const amountValue = formData.get("amount");
  const payoutDateValue = formData.get("payoutDate");
  const remarks = formData.get("remarks");

  if (typeof userId !== "string" || !userId) {
    return { error: "Missing employee." };
  }
  const amount = Number(amountValue);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Please enter a valid amount." };
  }
  if (typeof payoutDateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(payoutDateValue)) {
    return { error: "Please choose a valid date." };
  }

  const activeUser = await db.user.findUnique({ where: { id: userId, isActive: true }, select: { id: true } });
  if (!activeUser) return { error: "This employee is no longer active." };

  const payoutDate = toDateOnly(payoutDateValue);
  const weekStart = getPayWeekStart(payoutDate);

  try {
    await db.payrollAdvance.create({
      data: {
        userId,
        amount: amount.toFixed(2),
        payoutDate,
        weekStart,
        remarks: typeof remarks === "string" && remarks.trim() ? remarks.trim() : null,
        createdById: session.user.id,
      },
    });
  } catch (error) {
    console.error("recordPayrollAdvance failed:", error);
    return { error: "Couldn't record this advance — please try again." };
  }

  revalidatePath("/payroll/employee-earnings");
  return { success: "Advance recorded." };
}

export async function deletePayrollAdvance(
  _prevState: PayrollAdvanceFormState,
  formData: FormData
): Promise<PayrollAdvanceFormState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };
  if (!canManagePayroll(session.user)) {
    return { error: "You don't have permission to remove payroll advances." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing advance." };

  try {
    await db.payrollAdvance.delete({ where: { id } });
  } catch (error) {
    console.error("deletePayrollAdvance failed:", error);
    return { error: "Couldn't remove this advance — please try again." };
  }

  revalidatePath("/payroll/employee-earnings");
  return { success: "Advance removed." };
}
