"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatInputDate, parseInputDate, toDateOnly } from "@/lib/dates";

export async function toggleMyScheduleDate(date: string) {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, fullName: true, isActive: true },
  });

  if (!user?.isActive) {
    return { error: "Your account is not active." };
  }

  const inputDate = parseInputDate(date);
  if (inputDate < formatInputDate(new Date())) {
    return { error: "Past dates cannot be scheduled." };
  }

  const scheduleDate = toDateOnly(inputDate);
  const existing = await db.employeeSchedule.findUnique({
    where: {
      scheduleDate_userId: {
        scheduleDate,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await db.employeeSchedule.delete({
      where: { id: existing.id },
    });

    revalidatePath("/my-calendar");
    revalidatePath("/schedule");
    return { status: "removed" as const, user: { id: user.id, fullName: user.fullName } };
  }

  await db.employeeSchedule.create({
    data: {
      scheduleDate,
      userId: user.id,
    },
  });

  revalidatePath("/my-calendar");
  revalidatePath("/schedule");
  return { status: "added" as const, user: { id: user.id, fullName: user.fullName } };
}
