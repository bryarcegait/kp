"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManagePayroll } from "@/lib/payroll-access";

export type EmployeeRatesState = {
  success?: string;
  error?: string;
};

function parseMoney(value: FormDataEntryValue | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount >= 0 ? amount.toFixed(2) : "0.00";
}

function parseTimeToMinutes(value: FormDataEntryValue | null, fallback: number) {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return fallback;
  const [hour, minute] = value.split(":").map(Number);
  if (hour > 23 || minute > 59) return fallback;
  return hour * 60 + minute;
}

export async function saveEmployeeRate(
  _prevState: EmployeeRatesState,
  formData: FormData
): Promise<EmployeeRatesState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };
  if (!canManagePayroll(session.user)) {
    return { error: "You don't have permission to update employee rates." };
  }

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    return { error: "Missing employee." };
  }

  const activeUser = await db.user.findUnique({
    where: { id: userId, isActive: true },
    select: { id: true },
  });
  if (!activeUser) {
    return { error: "This employee is no longer active." };
  }

  const data = {
    dailyRate: parseMoney(formData.get("dailyRate")),
    scheduleStartMinutes: parseTimeToMinutes(formData.get("scheduleStart"), 600),
    scheduleEndMinutes: parseTimeToMinutes(formData.get("scheduleEnd"), 1200),
  };

  try {
    await db.employeePayrollProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  } catch (error) {
    console.error("saveEmployeeRate failed:", error);
    return { error: "Couldn't save this employee's rate — please try again." };
  }

  revalidatePath("/payroll/employee-rates");
  return { success: "Rate saved." };
}