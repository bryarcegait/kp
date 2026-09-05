import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AttendanceUploadClient } from "@/components/payroll/attendance-upload-client";
import { PayrollSubnav } from "@/components/payroll/payroll-subnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateOnly } from "@/lib/dates";
import { canManagePayroll, canViewPayroll } from "@/lib/payroll-access";
import { dateTimeToMinutes, minutesToTimeLabel } from "@/lib/timekeeping";

const LOGS_PER_PAGE = 20;

function minutesLabel(minutes: number) {
  if (minutes <= 0) return "-";
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

export default async function AttendanceUploadPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewPayroll(session.user)) redirect("/dashboard");

  const params = await searchParams;
  const requestedPage = Number(params?.page);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const totalLogs = await db.attendanceLog.count();
  const totalPages = Math.max(1, Math.ceil(totalLogs / LOGS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);

  const logs = await db.attendanceLog.findMany({
    skip: (page - 1) * LOGS_PER_PAGE,
    take: LOGS_PER_PAGE,
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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {totalLogs} log{totalLogs === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" disabled={page <= 1}>
                <Link
                  href={`/payroll/attendance-upload?page=${page - 1}`}
                  aria-disabled={page <= 1}
                  tabIndex={page <= 1 ? -1 : undefined}
                  className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
                <Link
                  href={`/payroll/attendance-upload?page=${page + 1}`}
                  aria-disabled={page >= totalPages}
                  tabIndex={page >= totalPages ? -1 : undefined}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}