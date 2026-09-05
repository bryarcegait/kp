"use client";

import { useActionState, useEffect, useRef } from "react";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteHoliday,
  upsertHoliday,
  type HolidayFormState,
} from "@/app/(app)/payroll/holidays/actions";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type HolidayRow = {
  id: string;
  date: string;
  name: string;
  type: "regular" | "special";
  multiplier: number;
};

const initialState: HolidayFormState = {};

function useFormToast(state: HolidayFormState, isPending: boolean) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.success) toast.success(state.success);
    }
    wasPending.current = isPending;
  }, [isPending, state.error, state.success]);
}

function DeleteHolidayButton({ id, canManage }: { id: string; canManage: boolean }) {
  const [state, action, isPending] = useActionState(deleteHoliday, initialState);
  useFormToast(state, isPending);
  if (!canManage) return null;

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="icon" disabled={isPending}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </form>
  );
}

export function HolidaysClient({
  holidays,
  canManage,
}: {
  holidays: HolidayRow[];
  canManage: boolean;
}) {
  const [state, action, isPending] = useActionState(upsertHoliday, initialState);
  useFormToast(state, isPending);

  return (
    <div className="grid gap-6">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Multiplier</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No holidays added yet.
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell>{formatDate(holiday.date)}</TableCell>
                  <TableCell className="font-medium">{holiday.name}</TableCell>
                  <TableCell>
                    <Badge variant={holiday.type === "regular" ? "default" : "secondary"}>
                      {holiday.type === "regular" ? "Regular" : "Special"}
                    </Badge>
                  </TableCell>
                  <TableCell>{holiday.multiplier.toFixed(2)}x</TableCell>
                  <TableCell className="text-right">
                    <DeleteHolidayButton id={holiday.id} canManage={canManage} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {canManage ? (
        <form action={action} className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Independence Day" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              defaultValue="regular"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="regular">Regular</option>
              <option value="special">Special (non-working)</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="multiplier">Multiplier (worked-day)</Label>
            <Input
              id="multiplier"
              name="multiplier"
              type="number"
              step="0.01"
              min="0"
              placeholder="2.00 or 1.30"
            />
          </div>
          {state.error ? (
            <p className="text-sm font-medium text-destructive sm:col-span-2 lg:col-span-4">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="w-fit sm:col-span-2 lg:col-span-4" disabled={isPending}>
            <Save className="size-4" />
            {isPending ? "Saving..." : "Add / update holiday"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
