"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInputDate, toDateOnly } from "@/lib/dates";
import { canManagePayroll } from "@/lib/payroll-access";
import {
  computeAttendanceMinutes,
  minutesToDateTime,
  parseAttendanceWorkbook,
} from "@/lib/timekeeping";

export type AttendanceUploadState = {
  success?: string;
  error?: string;
  details?: string[];
};

export async function uploadAttendance(
  _prevState: AttendanceUploadState,
  formData: FormData
): Promise<AttendanceUploadState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };
  if (!canManagePayroll(session.user)) {
    return { error: "You don't have permission to upload attendance." };
  }

  const file = formData.get("attendanceFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an Excel attendance file." };
  }

  let parsed;
  try {
    parsed = parseAttendanceWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to read attendance file.",
    };
  }

  if (parsed.length === 0) {
    return { error: "No attendance punches were found in the Excel file." };
  }

  const usernames = Array.from(
    new Set(parsed.map((item) => item.username).filter((value): value is string => Boolean(value)))
  );
  const users = await db.user.findMany({
    where: { username: { in: usernames }, isActive: true },
    select: {
      id: true,
      username: true,
      payrollProfile: {
        select: {
          scheduleStartMinutes: true,
          scheduleEndMinutes: true,
        },
      },
    },
  });
  const usersByUsername = new Map(users.map((user) => [user.username, user]));
  const skipped: string[] = [];
  const imports = parsed.flatMap((item) => {
    if (!item.username) {
      skipped.push(`Biometric ID ${item.biometricId} has no username mapping.`);
      return [];
    }

    const user = usersByUsername.get(item.username);
    if (!user) {
      skipped.push(`No active user found for ${item.username} (biometric ID ${item.biometricId}).`);
      return [];
    }

    const schedule = user.payrollProfile ?? {
      scheduleStartMinutes: 600,
      scheduleEndMinutes: 1200,
    };
    const computed = computeAttendanceMinutes(
      item.timeInMinutes,
      item.timeOutMinutes,
      schedule
    );
    const attendanceDate = toDateOnly(parseInputDate(item.attendanceDate));

    return [
      {
        userId: user.id,
        attendanceDate,
        timeIn: minutesToDateTime(item.attendanceDate, item.timeInMinutes),
        timeOut: minutesToDateTime(item.attendanceDate, item.timeOutMinutes),
        lateMinutes: computed.lateMinutes,
        undertimeMinutes: computed.undertimeMinutes,
        sourceFile: file.name,
        rawEmployeeCode: item.biometricId,
        importedById: session.user.id,
      },
    ];
  });

  if (imports.length === 0) {
    return { error: "No matching active employees were found for this upload.", details: skipped };
  }

  try {
    await db.$transaction(
      imports.map((item) =>
        db.attendanceLog.upsert({
          where: {
            userId_attendanceDate: {
              userId: item.userId,
              attendanceDate: item.attendanceDate,
            },
          },
          update: item,
          create: item,
        })
      )
    );
  } catch (error) {
    console.error("uploadAttendance transaction failed:", error);
    // TEMPORARY: surfacing the raw message to diagnose a prod-only failure
    // that doesn't reproduce locally. Revert to a generic message once found.
    const detail = error instanceof Error ? error.message : String(error);
    return { error: `Couldn't save the attendance logs — please try again. (${detail})` };
  }

  revalidatePath("/payroll/attendance-upload");
  revalidatePath("/my-calendar");

  return {
    success: `Imported ${imports.length} attendance log(s).`,
    details: skipped.slice(0, 8),
  };
}