import { redirect } from "next/navigation";
import { PayrollSubnav } from "@/components/payroll/payroll-subnav";
import {
  EmployeeEarningsClient,
  type DayBreakdown,
  type EmployeeWeekRow,
} from "@/components/payroll/employee-earnings-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateOnly, toDateOnly } from "@/lib/dates";
import { canManagePayroll, canViewPayroll } from "@/lib/payroll-access";
import { addDays, computeDailyEarnings, getPayWeekStart, type HolidayInfo } from "@/lib/payroll-earnings";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export default async function EmployeeEarningsPage({
  searchParams,
}: {
  searchParams?: Promise<{ week?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewPayroll(session.user)) redirect("/dashboard");

  const params = await searchParams;
  const weekStart =
    params?.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)
      ? toDateOnly(params.week)
      : getPayWeekStart(new Date());
  const weekEnd = addDays(weekStart, 6);

  const [employees, attendanceLogs, holidays, advances] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        username: true,
        payrollProfile: { select: { dailyRate: true } },
      },
      orderBy: { fullName: "asc" },
    }),
    db.attendanceLog.findMany({
      where: { attendanceDate: { gte: weekStart, lte: weekEnd } },
    }),
    db.holiday.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
    }),
    db.payrollAdvance.findMany({
      where: { weekStart },
      orderBy: { payoutDate: "asc" },
    }),
  ]);

  const holidayByDate = new Map<string, HolidayInfo>(
    holidays.map((holiday) => [
      formatDateOnly(holiday.date),
      { type: holiday.type as "regular" | "special", multiplier: Number(holiday.multiplier) },
    ])
  );
  const attendanceByKey = new Map(
    attendanceLogs.map((log) => [`${log.userId}:${formatDateOnly(log.attendanceDate)}`, log])
  );
  const advancesByUser = new Map<string, typeof advances>();
  for (const advance of advances) {
    const list = advancesByUser.get(advance.userId) ?? [];
    list.push(advance);
    advancesByUser.set(advance.userId, list);
  }

  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const employeeRows: EmployeeWeekRow[] = employees.map((employee) => {
    const dailyRate = Number(employee.payrollProfile?.dailyRate ?? 0);

    const days: DayBreakdown[] = weekDates.map((date) => {
      const key = formatDateOnly(date);
      const log = attendanceByKey.get(`${employee.id}:${key}`);
      const holiday = holidayByDate.get(key) ?? null;
      const earnings = computeDailyEarnings({
        timeIn: log?.timeIn ?? null,
        timeOut: log?.timeOut ?? null,
        dailyRate,
        holiday,
      });

      return {
        date: key,
        timeIn: log?.timeIn ? log.timeIn.toISOString() : null,
        timeOut: log?.timeOut ? log.timeOut.toISOString() : null,
        dayType: earnings.dayType,
        regularHours: earnings.regularHours,
        otHours: earnings.otHours,
        nightDiffMinutes: earnings.nightDiffMinutes,
        totalPay: earnings.totalPay,
        isIncomplete: earnings.isIncomplete,
      };
    });

    const grossPay = round2(days.reduce((sum, day) => sum + day.totalPay, 0));
    const employeeAdvances = (advancesByUser.get(employee.id) ?? []).map((advance) => ({
      id: advance.id,
      amount: Number(advance.amount),
      payoutDate: formatDateOnly(advance.payoutDate),
      remarks: advance.remarks,
    }));
    const advanceTotal = round2(
      employeeAdvances.reduce((sum, advance) => sum + advance.amount, 0)
    );

    return {
      userId: employee.id,
      fullName: employee.fullName,
      username: employee.username,
      dailyRate,
      days,
      grossPay,
      advances: employeeAdvances,
      advanceTotal,
      netPay: round2(grossPay - advanceTotal),
    };
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">
          Attendance, holiday pay, overtime, and night differential computed per Philippine
          labor law. Pay week runs Sunday through Saturday.
        </p>
      </div>
      <PayrollSubnav active="/payroll/employee-earnings" />
      <Card>
        <CardHeader>
          <CardTitle>Employee Earnings</CardTitle>
          <CardDescription>
            Earned-to-date updates as attendance is imported — employees don&apos;t have to wait
            until Sunday to see or draw against what they&apos;ve earned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeEarningsClient
            weekStart={formatDateOnly(weekStart)}
            weekEnd={formatDateOnly(weekEnd)}
            employees={employeeRows}
            canManage={canManagePayroll(session.user)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
