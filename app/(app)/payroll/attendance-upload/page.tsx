import { redirect } from "next/navigation";
import { AttendanceUploadClient } from "@/components/payroll/attendance-upload-client";
import { PayrollSubnav } from "@/components/payroll/payroll-subnav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateOnly } from "@/lib/dates";
import { canManagePayroll, canViewPayroll } from "@/lib/payroll-access";
import { dateTimeToMinutes, minutesToTimeLabel } from "@/lib/timekeeping";

function minutesLabel(minutes: number) {
  if (minutes <= 0) return "-";
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

export default async function AttendanceUploadPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewPayroll(session.user)) redirect("/dashboard");

  const logs = await db.attendanceLog.findMany({
    take: 50,
    include: {
      user: { select: { fullName: true, username: true } },
      importedBy: { select: { fullName: true } },
    },
    orderBy: [{ attendanceDate: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">Upload biometric attendance and save timekeeping logs for employee calendars.</p>
      </div>
      <PayrollSubnav active="/payroll/attendance-upload" />

      <Card>
        <CardHeader>
          <CardTitle>Attendance Upload</CardTitle>
          <CardDescription>
            Upload the biometric All Report Excel file. Late minutes use a 15-minute grace period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceUploadClient canManage={canManagePayroll(session.user)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Logs</CardTitle>
          <CardDescription>Latest imported IN/OUT logs that will appear in employee calendars.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>IN</TableHead>
                  <TableHead>OUT</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>UT</TableHead>
                  <TableHead className="hidden lg:table-cell">Imported By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No attendance logs uploaded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDateOnly(log.attendanceDate)}</TableCell>
                      <TableCell className="font-medium">
                        {log.user.fullName}
                        <span className="ml-2 text-xs text-muted-foreground">{log.user.username}</span>
                      </TableCell>
                      <TableCell>{minutesToTimeLabel(dateTimeToMinutes(log.timeIn)) ?? "-"}</TableCell>
                      <TableCell>{minutesToTimeLabel(dateTimeToMinutes(log.timeOut)) ?? "-"}</TableCell>
                      <TableCell>{minutesLabel(log.lateMinutes)}</TableCell>
                      <TableCell>{minutesLabel(log.undertimeMinutes)}</TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {log.importedBy?.fullName ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}