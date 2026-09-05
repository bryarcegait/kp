import * as XLSX from "xlsx";

export const BIOMETRIC_USERNAME_BY_ID: Record<string, string> = {
  "1": "bryarcega",
  "2": "bidek",
  "3": "nick",
  "4": "christian",
  "5": "tess",
  "6": "rose",
  "7": "aldrin",
  "8": "ruby",
  "9": "amy",
};

export type ParsedAttendancePunch = {
  biometricId: string;
  username: string | null;
  attendanceDate: string;
  timeInMinutes: number | null;
  timeOutMinutes: number | null;
  rawPunches: string;
};

export type PayrollSchedule = {
  scheduleStartMinutes: number;
  scheduleEndMinutes: number;
};

const DATE_RANGE_PATTERN = /(\d{4})-(\d{2})-(\d{2})\s*~\s*(\d{4})-(\d{2})-(\d{2})/;
const TIME_PATTERN = /\b(\d{1,2}):(\d{2})\b/g;

function cellText(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function parseDateRange(rows: unknown[][]) {
  for (const row of rows) {
    for (const cell of row) {
      const match = cellText(cell).match(DATE_RANGE_PATTERN);
      if (match) {
        return {
          year: Number(match[1]),
          month: Number(match[2]),
          startDay: Number(match[3]),
          endYear: Number(match[4]),
          endMonth: Number(match[5]),
          endDay: Number(match[6]),
        };
      }
    }
  }
  return null;
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The day row's column labels ("1", "2", "3"...) are the column's position
 * within the report's date range, not the calendar day-of-month — e.g. a
 * report starting on the 28th still labels its first column "1". Offsetting
 * from the range's start date (rather than reading the label as the day
 * number directly) also handles the range crossing a month or year boundary.
 */
function dateKeyForColumn(dateRange: NonNullable<ReturnType<typeof parseDateRange>>, column: number) {
  const date = new Date(Date.UTC(dateRange.year, dateRange.month - 1, dateRange.startDay));
  date.setUTCDate(date.getUTCDate() + (column - 1));
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function extractTimes(value: unknown) {
  const text = cellText(value);
  const times: number[] = [];
  for (const match of text.matchAll(TIME_PATTERN)) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      times.push(hour * 60 + minute);
    }
  }
  return Array.from(new Set(times)).sort((a, b) => a - b);
}

function dateTimeFromMinutes(dateKey: string, minutes: number | null) {
  if (minutes == null) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (minutes >= 1440) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export function minutesToTimeInput(minutes: number) {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function minutesToTimeLabel(minutes: number | null) {
  if (minutes == null) return null;
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function minutesToDateTime(dateKey: string, minutes: number | null) {
  return dateTimeFromMinutes(dateKey, minutes);
}

export function dateTimeToMinutes(value: Date | null) {
  if (!value) return null;
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

export function computeAttendanceMinutes(
  timeInMinutes: number | null,
  timeOutMinutes: number | null,
  schedule: PayrollSchedule
) {
  const lateMinutes =
    timeInMinutes == null
      ? 0
      : Math.max(0, timeInMinutes - schedule.scheduleStartMinutes - 15);

  let comparableOut = timeOutMinutes;
  let scheduleEnd = schedule.scheduleEndMinutes;
  if (scheduleEnd <= schedule.scheduleStartMinutes) scheduleEnd += 1440;
  if (
    comparableOut != null &&
    comparableOut < schedule.scheduleStartMinutes &&
    scheduleEnd > 1440
  ) {
    comparableOut += 1440;
  }

  const undertimeMinutes =
    comparableOut == null ? 0 : Math.max(0, scheduleEnd - comparableOut);

  return { lateMinutes, undertimeMinutes };
}

export function parseAttendanceWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { cellDates: true });
  const sheet = workbook.Sheets["Attendance Logs"];
  if (!sheet) throw new Error("This file has no \"Attendance Logs\" sheet.");

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });
  const dateRange = parseDateRange(rows);
  if (!dateRange) {
    throw new Error("Unable to find the attendance date range in the Excel file.");
  }

  const punches: ParsedAttendancePunch[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (cellText(row[0]).toLowerCase() !== "id") continue;

    const biometricId = row
      .slice(1)
      .map(cellText)
      .find((value) => /^\d+$/.test(value));
    if (!biometricId) continue;

    const dayRow = rows[rowIndex + 1] ?? [];
    const punchRow = rows[rowIndex + 3] ?? [];
    for (let col = 0; col < dayRow.length; col += 1) {
      const dayText = cellText(dayRow[col]);
      if (!/^\d{1,2}$/.test(dayText)) continue;

      const column = Number(dayText);
      const rawPunches = cellText(punchRow[col]);
      const times = extractTimes(rawPunches);
      if (times.length === 0) continue;

      // Every punch that day is one time log. The earliest is time in, the
      // latest is time out — with only one punch logged, there's no separate
      // "latest" to call a time out, so it's recorded as time in only.
      const timeInMinutes = times[0];
      const timeOutMinutes = times.length > 1 ? times.at(-1)! : null;

      punches.push({
        biometricId,
        username: BIOMETRIC_USERNAME_BY_ID[biometricId] ?? null,
        attendanceDate: dateKeyForColumn(dateRange, column),
        timeInMinutes,
        timeOutMinutes,
        rawPunches,
      });
    }
  }

  return punches;
}
