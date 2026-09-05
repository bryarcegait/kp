"use client";

import { useActionState, useEffect, useRef } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import {
  saveEmployeeRates,
  type EmployeeRatesState,
} from "@/app/(app)/payroll/employee-rates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type EmployeeRateRow = {
  id: string;
  fullName: string;
  username: string;
  dailyRate: string;
  scheduleStart: string;
  scheduleEnd: string;
};

const initialState: EmployeeRatesState = {};

function useFormToast(state: EmployeeRatesState, isPending: boolean) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.success) toast.success(state.success);
    }
    wasPending.current = isPending;
  }, [isPending, state.error, state.success]);
}

export function EmployeeRatesClient({
  employees,
  canManage,
}: {
  employees: EmployeeRateRow[];
  canManage: boolean;
}) {
  const [state, action, isPending] = useActionState(saveEmployeeRates, initialState);
  useFormToast(state, isPending);

  return (
    <form action={action} className="grid gap-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Daily Rate</TableHead>
              <TableHead>Schedule Start</TableHead>
              <TableHead>Schedule End</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">
                  <input type="hidden" name="userId" value={employee.id} />
                  {employee.fullName}
                </TableCell>
                <TableCell className="text-muted-foreground">{employee.username}</TableCell>
                <TableCell>
                  <Input
                    name={`dailyRate:${employee.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={employee.dailyRate}
                    disabled={!canManage || isPending}
                    className="min-w-32"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    name={`scheduleStart:${employee.id}`}
                    type="time"
                    defaultValue={employee.scheduleStart}
                    disabled={!canManage || isPending}
                    className="min-w-32"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    name={`scheduleEnd:${employee.id}`}
                    type="time"
                    defaultValue={employee.scheduleEnd}
                    disabled={!canManage || isPending}
                    className="min-w-32"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {canManage ? (
        <Button type="submit" className="w-fit" disabled={isPending}>
          <Save className="size-4" />
          {isPending ? "Saving..." : "Save Employee Rates"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Manager access is view-only for employee rates.</p>
      )}
    </form>
  );
}