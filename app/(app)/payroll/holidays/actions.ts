"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManagePayroll } from "@/lib/payroll-access";

export type HolidayFormState = {
  success?: string;
  error?: string;
};

const DEFAULT_MULTIPLIER: Record<string, string> = {
  regular: "2.00",
  special: "1.30",
};

export async function upsertHoliday(
  _prevState: HolidayFormState,
  formData: FormData
): Promise<HolidayFormState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };
  if (!canManagePayroll(session.user)) {
    return { error: "You don't have permission to manage the holiday calendar." };
  }

  const dateValue = formData.get("date");
  const name = formData.get("name");
  const type = formData.get("type");
  const multiplierValue = formData.get("multiplier");

  if (typeof dateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return { error: "Please choose a valid date." };
  }
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Please name the holiday." };
  }
  if (type !== "regular" && type !== "special") {
    return { error: "Please choose a holiday type." };
  }

  const multiplierText =
    typeof multiplierValue === "string" && multiplierValue.trim()
      ? multiplierValue
      : DEFAULT_MULTIPLIER[type];
  const multiplier = Number(multiplierText);
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    return { error: "Please enter a valid multiplier." };
  }

  try {
    await db.holiday.upsert({
      where: { date: new Date(`${dateValue}T00:00:00.000Z`) },
      update: { name: name.trim(), type, multiplier: multiplier.toFixed(2) },
      create: {
        date: new Date(`${dateValue}T00:00:00.000Z`),
        name: name.trim(),
        type,
        multiplier: multiplier.toFixed(2),
      },
    });
  } catch (error) {
    console.error("upsertHoliday failed:", error);
    return { error: "Couldn't save this holiday — please try again." };
  }

  revalidatePath("/payroll/holidays");
  revalidatePath("/payroll/employee-earnings");
  return { success: "Holiday saved." };
}

export async function deleteHoliday(
  _prevState: HolidayFormState,
  formData: FormData
): Promise<HolidayFormState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };
  if (!canManagePayroll(session.user)) {
    return { error: "You don't have permission to manage the holiday calendar." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing holiday." };

  try {
    await db.holiday.delete({ where: { id } });
  } catch (error) {
    console.error("deleteHoliday failed:", error);
    return { error: "Couldn't remove this holiday — please try again." };
  }

  revalidatePath("/payroll/holidays");
  revalidatePath("/payroll/employee-earnings");
  return { success: "Holiday removed." };
}
