"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInputDate, toDateOnly } from "@/lib/dates";
import { canManageSchedule } from "@/lib/schedule-access";

export async function saveDaySchedule(date: string, userIds: string[]) {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };

  if (!canManageSchedule(session.user)) {
    return { error: "You don't have permission to update schedules." };
  }

  const scheduleDate = toDateOnly(parseInputDate(date));
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  const activeUsers = await db.user.findMany({
    where: { id: { in: uniqueUserIds }, isActive: true },
    select: { id: true },
  });
  const activeUserIds = activeUsers.map((user) => user.id);

  await db.$transaction(async (tx) => {
    await tx.employeeSchedule.deleteMany({
      where: { scheduleDate },
    });

    if (activeUserIds.length > 0) {
      await tx.employeeSchedule.createMany({
        data: activeUserIds.map((userId) => ({
          scheduleDate,
          userId,
        })),
      });
    }
  });

  revalidatePath("/schedule");
  return {};
}

export async function copyDaySchedule(sourceDate: string, targetDate: string) {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };

  if (!canManageSchedule(session.user)) {
    return { error: "You don't have permission to update schedules." };
  }

  const sourceBusinessDate = parseInputDate(sourceDate);
  const targetBusinessDate = parseInputDate(targetDate);
  const sourceScheduleDate = toDateOnly(sourceBusinessDate);
  const targetScheduleDate = toDateOnly(targetBusinessDate);

  const sourceSchedules = await db.employeeSchedule.findMany({
    where: { scheduleDate: sourceScheduleDate },
    select: { userId: true },
  });
  const sourceUserIds = sourceSchedules.map((schedule) => schedule.userId);

  await db.$transaction(async (tx) => {
    await tx.employeeSchedule.deleteMany({
      where: { scheduleDate: targetScheduleDate },
    });

    if (sourceUserIds.length > 0) {
      await tx.employeeSchedule.createMany({
        data: sourceUserIds.map((userId) => ({
          scheduleDate: targetScheduleDate,
          userId,
        })),
      });
    }
  });

  revalidatePath("/schedule");
  return { userIds: sourceUserIds };
}
