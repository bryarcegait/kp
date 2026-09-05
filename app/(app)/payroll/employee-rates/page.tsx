import { redirect } from "next/navigation";
import { EmployeeRatesClient } from "@/components/payroll/employee-rates-client";
import { PayrollSubnav } from "@/components/payroll/payroll-subnav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManagePayroll, canViewPayroll } from "@/lib/payroll-access";
import { minutesToTimeInput } from "@/lib/timekeeping";

export default async function EmployeeRatesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewPayroll(session.user)) redirect("/dashboard");

  const employees = await db.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      username: true,
      payrollProfile: true,
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">Maintain employee schedules for attendance and payroll calculations.</p>
      </div>
      <PayrollSubnav active="/payroll/employee-rates" />
      <Card>
        <CardHeader>
          <CardTitle>Employee Rates</CardTitle>
          <CardDescription>
            System Admin can update daily rates and work schedules. Manager access is view-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeRatesClient
            canManage={canManagePayroll(session.user)}
            employees={employees.map((employee) => ({
              id: employee.id,
              fullName: employee.fullName,
              username: employee.username,
              dailyRate: Number(employee.payrollProfile?.dailyRate ?? 0).toFixed(2),
              scheduleStart: minutesToTimeInput(employee.payrollProfile?.scheduleStartMinutes ?? 600),
              scheduleEnd: minutesToTimeInput(employee.payrollProfile?.scheduleEndMinutes ?? 1200),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}