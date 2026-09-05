import { dateTimeToMinutes } from "@/lib/timekeeping";

const UNPAID_BREAK_MINUTES = 60;
const STANDARD_WORK_MINUTES = 8 * 60;
const ORDINARY_OT_MULTIPLIER = 1.25;
const HOLIDAY_OT_MULTIPLIER = 1.3;
const NIGHT_DIFF_MULTIPLIER = 0.1;
// Night differential window, Labor Code Art. 86: 10:00 PM to 6:00 AM.
const NIGHT_START_MINUTES = 22 * 60;
const NIGHT_END_MINUTES = 30 * 60; // 6:00 AM the next day, in the same rolled-over frame as timeOut.

export type HolidayInfo = {
  type: "regular" | "special";
  multiplier: number;
} | null;

export type DailyEarnings = {
  /** Null when there's no complete IN/OUT pair to compute from. */
  isIncomplete: boolean;
  dayType: "ordinary" | "regular" | "special";
  regularHours: number;
  otHours: number;
  nightDiffMinutes: number;
  regularPay: number;
  otPay: number;
  nightDiffPay: number;
  totalPay: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * How many minutes of a [start, end) window (in minutes-since-midnight,
 * rolled over past 1440 for an overnight shift) fall inside the nightly
 * 10pm-6am differential window.
 */
function overlapWithNightWindow(start: number, end: number) {
  let total = 0;
  // Check both "tonight's" 10pm-6am window and, for shifts that start very
  // late, the previous night's window rolled forward — covers any shift
  // that could plausibly touch either boundary.
  for (const offset of [-1440, 0, 1440]) {
    const windowStart = NIGHT_START_MINUTES + offset;
    const windowEnd = NIGHT_END_MINUTES + offset;
    const overlapStart = Math.max(start, windowStart);
    const overlapEnd = Math.min(end, windowEnd);
    if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
  }
  return total;
}

/**
 * Computes one employee's pay for one attendance day.
 *
 * The 1-hour unpaid break is assumed to happen somewhere in the middle of
 * the shift without a recorded exact time, so night-differential minutes
 * are derived from the raw clock-in/out span and then scaled down by the
 * same ratio the break shrinks total paid time by — a reasonable
 * approximation rather than requiring a logged break time.
 */
export function computeDailyEarnings({
  timeIn,
  timeOut,
  dailyRate,
  holiday,
}: {
  timeIn: Date | null;
  timeOut: Date | null;
  dailyRate: number;
  holiday: HolidayInfo;
}): DailyEarnings {
  const dayType = holiday?.type ?? "ordinary";

  if (!timeIn || !timeOut) {
    // A Regular Holiday still gets paid even if the employee didn't come
    // in that day — per DOLE, "no work, still paid" for regular holidays.
    const totalPay = dayType === "regular" ? round2(dailyRate) : 0;
    return {
      isIncomplete: true,
      dayType,
      regularHours: 0,
      otHours: 0,
      nightDiffMinutes: 0,
      regularPay: totalPay,
      otPay: 0,
      nightDiffPay: 0,
      totalPay,
    };
  }

  const inMinutes = dateTimeToMinutes(timeIn)!;
  let outMinutes = dateTimeToMinutes(timeOut)!;
  if (outMinutes <= inMinutes) outMinutes += 1440; // overnight shift

  const rawWorkedMinutes = outMinutes - inMinutes;
  const paidMinutes = Math.max(0, rawWorkedMinutes - UNPAID_BREAK_MINUTES);
  const regularMinutes = Math.min(paidMinutes, STANDARD_WORK_MINUTES);
  const otMinutes = Math.max(0, paidMinutes - STANDARD_WORK_MINUTES);

  const nightMinutesRaw = overlapWithNightWindow(inMinutes, outMinutes);
  const nightMinutesPaid =
    rawWorkedMinutes > 0 ? (nightMinutesRaw * paidMinutes) / rawWorkedMinutes : 0;

  const hourlyRate = dailyRate / 8;
  const dayMultiplier = holiday?.multiplier ?? 1;
  const otMultiplier = dayType === "ordinary" ? ORDINARY_OT_MULTIPLIER : HOLIDAY_OT_MULTIPLIER;

  const regularPay = (regularMinutes / 60) * hourlyRate * dayMultiplier;
  const otPay = (otMinutes / 60) * hourlyRate * dayMultiplier * otMultiplier;
  // Night differential is +10% of whatever hourly rate already applies to
  // those minutes; approximate "whatever applies" as the blended rate
  // across the whole paid shift rather than tracking exactly which hours
  // (regular or OT) were worked at night.
  const blendedHourlyRate = paidMinutes > 0 ? ((regularPay + otPay) / paidMinutes) * 60 : 0;
  const nightDiffPay = (nightMinutesPaid / 60) * blendedHourlyRate * NIGHT_DIFF_MULTIPLIER;

  const totalPay = regularPay + otPay + nightDiffPay;

  return {
    isIncomplete: false,
    dayType,
    regularHours: round2(regularMinutes / 60),
    otHours: round2(otMinutes / 60),
    nightDiffMinutes: Math.round(nightMinutesPaid),
    regularPay: round2(regularPay),
    otPay: round2(otPay),
    nightDiffPay: round2(nightDiffPay),
    totalPay: round2(totalPay),
  };
}

/** The Sunday (00:00) that starts the pay week containing `date`. */
export function getPayWeekStart(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return start;
}

/** [Sunday, Saturday] (inclusive) for the pay week starting on `weekStart`. */
export function getPayWeekRange(weekStart: Date) {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: weekStart, end };
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
