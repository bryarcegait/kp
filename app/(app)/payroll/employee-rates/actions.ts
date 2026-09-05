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

export async function saveEmployeeRates(
  _prevState: EmployeeRatesState,
  formData: FormData
): Promise<EmployeeRatesState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };
  if (!canManagePayroll(session.user)) {
    return { error: "You don't have permission to update employee rates." };
  }

  const userIds = formData.getAll("userId").filter((value): value is string => typeof value === "string" && value.length > 0);
  const activeUsers = await db.user.findMany({
    where: { id: { in: userIds }, isActive: true },
    select: { id: true },
  });
  const activeUserIds = new Set(activeUsers.map((user) => user.id));

  await db.$transaction(
    userIds
      .filter((userId) => activeUserIds.has(userId))
      .map((userId) =>
        db.employeePayrollProfile.upsert({
          where: { userId },
          update: {
            dailyRate: parseMoney(formData.get(`dailyRate:${userId}`)),
            scheduleStartMinutes: parseTimeToMinutes(formData.get(`scheduleStart:${userId}`), 600),
            scheduleEndMinutes: parseTimeToMinutes(formData.get(`scheduleEnd:${userId}`), 1200),
          },
          create: {
            userId,
            dailyRate: parseMoney(formData.get(`dailyRate:${userId}`)),
            scheduleStartMinutes: parseTimeToMinutes(formData.get(`scheduleStart:${userId}`), 600),
            scheduleEndMinutes: parseTimeToMinutes(formData.get(`scheduleEnd:${userId}`), 1200),
          },
        })
      )
  );

  revalidatePath("/payroll/employee-rates");
  return { success: "Employee rates saved." };
}