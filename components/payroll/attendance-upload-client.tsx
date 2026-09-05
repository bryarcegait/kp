"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  uploadAttendance,
  type AttendanceUploadState,
} from "@/app/(app)/payroll/attendance-upload/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AttendanceUploadState = {};

function useFormToast(state: AttendanceUploadState, isPending: boolean) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.success) toast.success(state.success);
    }
    wasPending.current = isPending;
  }, [isPending, state.error, state.success]);
}

export function AttendanceUploadClient({ canManage }: { canManage: boolean }) {
  const [state, action, isPending] = useActionState(uploadAttendance, initialState);
  useFormToast(state, isPending);

  if (!canManage) {
    return <p className="text-sm text-muted-foreground">Attendance upload is available to System Admin only.</p>;
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid max-w-xl gap-2">
        <Label htmlFor="attendanceFile">Excel attendance report</Label>
        <Input
          id="attendanceFile"
          name="attendanceFile"
          type="file"
          accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={isPending}
          required
        />
        <p className="text-xs text-muted-foreground">
          Upload the biometric All Report file. Biometric IDs are matched to employee usernames before saving.
        </p>
      </div>

      {isPending ? (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          <span>
            Reading the file and matching employees, then saving each day&apos;s logs — this can
            take up to 10-15 seconds for a full report. Please don&apos;t close this page.
          </span>
        </div>
      ) : null}

      {state.details && state.details.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {state.details.map((detail) => (
            <p key={detail}>{detail}</p>
          ))}
        </div>
      ) : null}

      <Button type="submit" className="w-fit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {isPending ? "Uploading..." : "Upload Attendance"}
      </Button>
    </form>
  );
}