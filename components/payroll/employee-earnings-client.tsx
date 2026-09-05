"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deletePayrollAdvance,
  recordPayrollAdvance,
  type PayrollAdvanceFormState,
} from "@/app/(app)/payroll/employee-earnings/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { addInputDateDays, formatInputDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type DayBreakdown = {
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  dayType: "ordinary" | "regular" | "special";
  regularHours: number;
  otHours: number;
  nightDiffMinutes: number;
  totalPay: number;
  isIncomplete: boolean;
};

export type EmployeeWeekRow = {
  userId: string;
  fullName: string;
  username: string;
  dailyRate: number;
  days: DayBreakdown[];
  grossPay: number;
  advances: { id: string; amount: number; payoutDate: string; remarks: string | null }[];
  advanceTotal: number;
  netPay: number;
};

const initialState: PayrollAdvanceFormState = {};

function useFormToast(state: PayrollAdvanceFormState, isPending: boolean) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.success) toast.success(state.success);
    }
    wasPending.current = isPending;
  }, [isPending, state.error, state.success]);
}

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function dayTypeBadge(dayType: DayBreakdown["dayType"]) {
  if (dayType === "regular") return <Badge>Regular Holiday</Badge>;
  if (dayType === "special") return <Badge variant="secondary">Special Holiday</Badge>;
  return null;
}

function AdvanceForm({ userId, weekStart }: { userId: string; weekStart: string }) {
  const [state, action, isPending] = useActionState(recordPayrollAdvance, initialState);
  useFormToast(state, isPending);

  return (
    <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid gap-1">
        <Label htmlFor={`amount-${userId}`} className="text-xs">
          Amount
        </Label>
        <Input
          id={`amount-${userId}`}
          name="amount"
          type="number"
          min="0"
          step="0.01"
          required
          className="h-8"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`date-${userId}`} className="text-xs">
          Date
        </Label>
        <Input
          id={`date-${userId}`}
          name="payoutDate"
          type="date"
          defaultValue={formatInputDate(new Date())}
          min={weekStart}
          max={addInputDateDays(weekStart, 6)}
          required
          className="h-8"
        />
      </div>
      <div className="grid gap-1 sm:col-span-2">
        <Label htmlFor={`remarks-${userId}`} className="text-xs">
          Note (optional)
        </Label>
        <Input id={`remarks-${userId}`} name="remarks" className="h-8" />
      </div>
      {state.error ? (
        <p className="col-span-2 text-xs font-medium text-destructive sm:col-span-4">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="sm" variant="outline" disabled={isPending} className="w-fit">
        <PlusCircle className="size-3.5" />
        {isPending ? "Saving..." : "Record advance"}
      </Button>
    </form>
  );
}

function DeleteAdvanceButton({ id }: { id: string }) {
  const [state, action, isPending] = useActionState(deletePayrollAdvance, initialState);
  useFormToast(state, isPending);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="icon" className="size-6" disabled={isPending}>
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
    </form>
  );
}

function EmployeeWeekCard({
  employee,
  weekStart,
  canManage,
}: {
  employee: EmployeeWeekRow;
  weekStart: string;
  canManage: boolean;
}) {
  return (
    <details className="rounded-lg border">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-medium">{employee.fullName}</p>
          <p className="text-xs text-muted-foreground">{employee.username}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Gross <span className="font-semibold text-foreground">{formatCurrency(employee.grossPay)}</span>
          </span>
          {employee.advanceTotal > 0 ? (
            <span className="text-muted-foreground">
              Advances <span className="font-semibold text-destructive">-{formatCurrency(employee.advanceTotal)}</span>
            </span>
          ) : null}
          <Badge variant={employee.netPay >= 0 ? "default" : "destructive"}>
            Net {formatCurrency(employee.netPay)}
          </Badge>
        </div>
      </summary>

      <div className="grid gap-4 border-t p-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>IN</TableHead>
                <TableHead>OUT</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Reg hrs</TableHead>
                <TableHead>OT hrs</TableHead>
                <TableHead>Night diff</TableHead>
                <TableHead className="text-right">Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employee.days.map((day) => (
                <TableRow key={day.date}>
                  <TableCell>{formatDate(day.date)}</TableCell>
                  <TableCell>{formatTime(day.timeIn)}</TableCell>
                  <TableCell>{formatTime(day.timeOut)}</TableCell>
                  <TableCell>{dayTypeBadge(day.dayType)}</TableCell>
                  <TableCell>{day.regularHours || "-"}</TableCell>
                  <TableCell>{day.otHours || "-"}</TableCell>
                  <TableCell>{day.nightDiffMinutes ? `${day.nightDiffMinutes}m` : "-"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(day.totalPay)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {employee.advances.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-sm font-medium">Advances this week</p>
            {employee.advances.map((advance) => (
              <div
                key={advance.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2 text-sm"
              >
                <div>
                  <span className="font-medium">{formatCurrency(advance.amount)}</span>{" "}
                  <span className="text-muted-foreground">
                    on {formatDate(advance.payoutDate)}
                    {advance.remarks ? ` — ${advance.remarks}` : ""}
                  </span>
                </div>
                {canManage ? <DeleteAdvanceButton id={advance.id} /> : null}
              </div>
            ))}
          </div>
        ) : null}

        {canManage ? <AdvanceForm userId={employee.userId} weekStart={weekStart} /> : null}
      </div>
    </details>
  );
}

export function EmployeeEarningsClient({
  weekStart,
  weekEnd,
  employees,
  canManage,
}: {
  weekStart: string;
  weekEnd: string;
  employees: EmployeeWeekRow[];
  canManage: boolean;
}) {
  const previousWeek = addInputDateDays(weekStart, -7);
  const nextWeek = addInputDateDays(weekStart, 7);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">
          Week of {formatDate(weekStart)} – {formatDate(weekEnd)}
        </p>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/payroll/employee-earnings?week=${previousWeek}`}>
              <ChevronLeft className="size-4" />
              Previous week
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/payroll/employee-earnings?week=${nextWeek}`}>
              Next week
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {employees.map((employee) => (
          <EmployeeWeekCard
            key={employee.userId}
            employee={employee}
            weekStart={weekStart}
            canManage={canManage}
          />
        ))}
        {employees.length === 0 ? (
          <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
            No active employees found.
          </p>
        ) : null}
      </div>
    </div>
  );
}
