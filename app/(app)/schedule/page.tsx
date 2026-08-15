import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDateOnlyRange, formatDateOnly, formatInputDate } from "@/lib/dates";
import { canManageSchedule, canViewSchedule } from "@/lib/schedule-access";
import { ScheduleCalendar } from "@/components/schedule/schedule-calendar";

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

export default async function SchedulePage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string | string[] }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewSchedule(session.user)) redirect("/");

  const params = await searchParams;
  const month = parseMonth(
    Array.isArray(params?.month) ? params.month[0] : params?.month
  );
  const { start, end } = getCalendarRange(month);
  const canManage = canManageSchedule(session.user);

  const [users, schedules] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        birthday: true,
        dateHired: true,
      },
      orderBy: { fullName: "asc" },
    }),
    db.employeeSchedule.findMany({
      where: {
        scheduleDate: {
          gte: start,
          lt: end,
        },
      },
      include: {
        user: { select: { fullName: true } },
      },
      orderBy: [{ scheduleDate: "asc" }, { user: { fullName: "asc" } }],
    }),
  ]);

  const scheduleByDate = schedules.reduce<Record<string, string[]>>(
    (map, item) => {
      const dateKey = formatDateOnly(item.scheduleDate);
      map[dateKey] = [...(map[dateKey] ?? []), item.userId];
      return map;
    },
    {}
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Employee Schedule
        </h1>
        <p className="text-muted-foreground">
          Assign active employees to each date and track birthdays and work
          anniversaries.
        </p>
      </div>

      <ScheduleCalendar
        key={month}
        month={month}
        canManage={canManage}
        employees={users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          birthday: user.birthday ? formatDateOnly(user.birthday) : null,
          dateHired: user.dateHired ? formatDateOnly(user.dateHired) : null,
        }))}
        scheduleByDate={scheduleByDate}
      />
    </div>
  );
}
