import { redirect } from "next/navigation";
import { UserScheduleCalendar } from "@/components/schedule/user-schedule-calendar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateOnly, formatInputDate, getDateOnlyRange } from "@/lib/dates";
import { dateTimeToMinutes, minutesToTimeLabel } from "@/lib/timekeeping";

function parseMonth(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function getCalendarRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const lastDay = new Date(year, monthNumber, 0);
  const start = new Date(firstDay);
  const firstDayOffset = (firstDay.getDay() + 6) % 7;
  start.setDate(firstDay.getDate() - firstDayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(lastDay);
  const lastDayOffset = (lastDay.getDay() + 6) % 7;
  end.setDate(lastDay.getDate() + (6 - lastDayOffset) + 1);
  end.setHours(0, 0, 0, 0);

  return {
    start: getDateOnlyRange(formatInputDate(start)).start,
    end: getDateOnlyRange(formatInputDate(end)).start,
  };
}

export default async function MyCalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string | string[] }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const month = parseMonth(
    Array.isArray(params?.month) ? params.month[0] : params?.month
  );
  const { start, end } = getCalendarRange(month);

  const [currentUser, schedules, attendanceLogs] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, fullName: true, isActive: true },
    }),
    db.employeeSchedule.findMany({
      where: {
        scheduleDate: {
          gte: start,
          lt: end,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [{ scheduleDate: "asc" }, { user: { fullName: "asc" } }],
    }),
    db.attendanceLog.findMany({
      where: {
        userId: session.user.id,
        attendanceDate: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { attendanceDate: "asc" },
    }),
  ]);

  if (!currentUser?.isActive) redirect("/login");

  const scheduleByDate = schedules.reduce<
    Record<string, { id: string; fullName: string }[]>
  >((map, item) => {
    const dateKey = formatDateOnly(item.scheduleDate);
    map[dateKey] = [
      ...(map[dateKey] ?? []),
      { id: item.user.id, fullName: item.user.fullName },
    ];
    return map;
  }, {});

  const attendanceByDate = attendanceLogs.reduce<
    Record<
      string,
      {
        timeIn: string | null;
        timeOut: string | null;
        lateMinutes: number;
        undertimeMinutes: number;
      }
    >
  >((map, item) => {
    map[formatDateOnly(item.attendanceDate)] = {
      timeIn: minutesToTimeLabel(dateTimeToMinutes(item.timeIn)),
      timeOut: minutesToTimeLabel(dateTimeToMinutes(item.timeOut)),
      lateMinutes: item.lateMinutes,
      undertimeMinutes: item.undertimeMinutes,
    };
    return map;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Calendar</h1>
        <p className="text-muted-foreground">
          Your monthly schedule with coemployee sign-ups.
        </p>
      </div>

      <UserScheduleCalendar
        key={month}
        month={month}
        currentUser={{
          id: currentUser.id,
          fullName: currentUser.fullName,
        }}
        scheduleByDate={scheduleByDate}
        attendanceByDate={attendanceByDate}
      />
    </div>
  );
}
