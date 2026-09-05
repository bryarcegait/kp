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

// Names (or distinctive substrings) of holidays the Philippines designates
// as Regular Holidays (100% pay if unworked, 200% + OT if worked). Everything
// else the public holiday feed returns is treated as a Special (non-working)
// holiday (0% if unworked, 130% + OT if worked) — the more common case for
// anything not on this list. Matched case-insensitively against whatever
// English name the API returns, since wording can vary slightly year to
// year.
const REGULAR_HOLIDAY_MATCHERS = [
  "new year's day",
  "maundy thursday",
  "good friday",
  "day of valor",
  "araw ng kagitingan",
  "labour day",
  "labor day",
  "independence day",
  "national heroes day",
  "bonifacio day",
  "christmas day",
  "rizal day",
  "eid",
];

function classifyHoliday(englishName: string): "regular" | "special" {
  const lower = englishName.toLowerCase();
  return REGULAR_HOLIDAY_MATCHERS.some((matcher) => lower.includes(matcher))
    ? "regular"
    : "special";
}

export async function syncHolidaysFromApi(
  _prevState: HolidayFormState,
  formData: FormData
): Promise<HolidayFormState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };
  if (!canManagePayroll(session.user)) {
    return { error: "You don't have permission to manage the holiday calendar." };
  }

  const yearValue = formData.get("year");
  const year = Number(yearValue);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return { error: "Please choose a valid year." };
  }

  let fetched: { date: string; name: string }[];
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`API responded with ${response.status}`);
    const payload: { date: string; name: string }[] = await response.json();
    fetched = payload.map((item) => ({ date: item.date, name: item.name }));
  } catch (error) {
    console.error("syncHolidaysFromApi fetch failed:", error);
    return { error: "Couldn't reach the holiday API — please try again later." };
  }

  if (fetched.length === 0) {
    return { error: `No holidays found for ${year}.` };
  }

  const existing = await db.holiday.findMany({
    where: { date: { in: fetched.map((item) => new Date(`${item.date}T00:00:00.000Z`)) } },
    select: { date: true },
  });
  const existingDates = new Set(existing.map((item) => item.date.toISOString().slice(0, 10)));

  // Only fill in dates that aren't already on the calendar — never overwrite
  // a holiday the admin already added or customized (name, type, multiplier).
  const toCreate = fetched.filter((item) => !existingDates.has(item.date));
  if (toCreate.length === 0) {
    return { success: `Already up to date — every ${year} holiday is already on the calendar.` };
  }

  try {
    await db.holiday.createMany({
      data: toCreate.map((item) => {
        const type = classifyHoliday(item.name);
        return {
          date: new Date(`${item.date}T00:00:00.000Z`),
          name: item.name,
          type,
          multiplier: DEFAULT_MULTIPLIER[type],
        };
      }),
    });
  } catch (error) {
    console.error("syncHolidaysFromApi save failed:", error);
    return { error: "Fetched the holidays but couldn't save them — please try again." };
  }

  revalidatePath("/payroll/holidays");
  revalidatePath("/payroll/employee-earnings");
  revalidatePath("/schedule");
  revalidatePath("/my-calendar");
  return {
    success: `Added ${toCreate.length} holiday${toCreate.length === 1 ? "" : "s"} for ${year}. Review the types/multipliers below — the classification is a best guess.`,
  };
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
