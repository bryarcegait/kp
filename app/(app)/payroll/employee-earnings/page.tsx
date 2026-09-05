import { redirect } from "next/navigation";
import { PayrollSubnav } from "@/components/payroll/payroll-subnav";
import { auth } from "@/lib/auth";
import { canViewPayroll } from "@/lib/payroll-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EmployeeEarningsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewPayroll(session.user)) redirect("/dashboard");

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">Timekeeping is ready. Employee earnings will be added next.</p>
      </div>
      <PayrollSubnav active="/payroll/employee-earnings" />
      <Card>
        <CardHeader>
          <CardTitle>Employee Earnings</CardTitle>
          <CardDescription>Payroll computation will continue here after the timekeeping setup.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Attendance logs, late minutes, and undertime minutes are now stored for payroll computation.
        </CardContent>
      </Card>
    </div>
  );
}