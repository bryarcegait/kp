import { redirect } from "next/navigation";
import { PayrollSubnav } from "@/components/payroll/payroll-subnav";
import { HolidaysClient, type HolidayRow } from "@/components/payroll/holidays-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManagePayroll, canViewPayroll } from "@/lib/payroll-access";

export default async function HolidaysPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewPayroll(session.user)) redirect("/dashboard");

  const holidays = await db.holiday.findMany({ orderBy: { date: "asc" } });
  const holidayRows: HolidayRow[] = holidays.map((holiday) => ({
    id: holiday.id,
    date: holiday.date.toISOString().slice(0, 10),
    name: holiday.name,
    type: holiday.type as "regular" | "special",
    multiplier: Number(holiday.multiplier),
  }));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">
          Maintain the holiday calendar used to compute holiday pay.
        </p>
      </div>
      <PayrollSubnav active="/payroll/holidays" />
      <Card>
        <CardHeader>
          <CardTitle>Holiday Calendar</CardTitle>
          <CardDescription>
            Regular holidays pay 100% even if unworked, and 200% (plus overtime) if worked.
            Special (non-working) holidays pay 0% if unworked, 130% if worked. Movable dates
            (Maundy Thursday, Eid, etc.) need to be added or adjusted each year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HolidaysClient holidays={holidayRows} canManage={canManagePayroll(session.user)} />
        </CardContent>
      </Card>
    </div>
  );
}
