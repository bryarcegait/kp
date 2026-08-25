"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  saveShiftEnd,
  saveShiftStart,
  type CashSummaryFormState,
} from "@/app/(app)/cash-summary/actions";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type CashSummaryFormValues = {
  businessDate: string;
  startingAmount: string;
  adjustments: {
    id: string;
    name: string;
    amount: string;
  }[];
  cashOnHand: string;
  openingCashForTomorrow: string;
  notes: string;
};

const initialState: CashSummaryFormState = {};

function useFormToast(state: CashSummaryFormState, isPending: boolean) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.success) toast.success(state.success);
    }
    wasPending.current = isPending;
  }, [isPending, state.error, state.success]);
}

export function CashSummaryForm({
  summary,
  canManage,
}: {
  summary: CashSummaryFormValues;
  canManage: boolean;
}) {
  const router = useRouter();
  const [shiftStartState, shiftStartAction, isShiftStartPending] = useActionState(
    saveShiftStart,
    initialState
  );
  const [shiftEndState, shiftEndAction, isShiftEndPending] = useActionState(
    saveShiftEnd,
    initialState
  );
  const [businessDate, setBusinessDate] = useState(summary.businessDate);
  const [cashOnHand, setCashOnHand] = useState(summary.cashOnHand);
  const [openingCashForTomorrow, setOpeningCashForTomorrow] = useState(
    summary.openingCashForTomorrow
  );
  const [adjustments, setAdjustments] = useState(() =>
    summary.adjustments.length > 0
      ? summary.adjustments
      : [{ id: "new-0", name: "", amount: "" }]
  );

  useFormToast(shiftStartState, isShiftStartPending);
  useFormToast(shiftEndState, isShiftEndPending);

  const updateBusinessDate = (value: string) => {
    setBusinessDate(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      router.replace(`/cash-summary?date=${value}`, { scroll: false });
    }
  };

  const addAdjustment = () => {
    setAdjustments((current) => [
      ...current,
      { id: `new-${Date.now()}`, name: "", amount: "" },
    ]);
  };

  const updateAdjustment = (
    id: string,
    field: "name" | "amount",
    value: string
  ) => {
    setAdjustments((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeAdjustment = (id: string) => {
    setAdjustments((current) =>
      current.length === 1
        ? [{ id: "new-0", name: "", amount: "" }]
        : current.filter((item) => item.id !== id)
    );
  };

  const adjustmentTotal = adjustments.reduce(
    (sum, adjustment) => sum + Number(adjustment.amount || 0),
    0
  );
  const cashToBank = Math.max(
    0,
    Number(cashOnHand || 0) - Number(openingCashForTomorrow || 0)
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Daily Drawer Inputs</h2>
          <p className="text-sm text-muted-foreground">
            Business Date defaults to today. Shift Start and Shift End can be
            saved separately.
          </p>
        </div>
        <div className="grid gap-2 md:w-72">
          <Label htmlFor="businessDate">Business Date</Label>
          <Input
            id="businessDate"
            type="date"
            value={businessDate}
            onChange={(event) => updateBusinessDate(event.target.value)}
            readOnly={!canManage}
            required
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form
          action={shiftStartAction}
          className="grid content-start gap-4 rounded-lg border p-4"
        >
          <input type="hidden" name="businessDate" value={businessDate} />
          <div>
            <h2 className="text-lg font-semibold">Shift Start</h2>
            <p className="text-sm text-muted-foreground">
              Set the opening drawer cash before sales begin.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="startingAmount">Opening Cash</Label>
            <Input
              id="startingAmount"
              name="startingAmount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={summary.startingAmount}
              readOnly={!canManage}
              required
            />
            {shiftStartState.fieldErrors?.startingAmount ? (
              <p className="text-sm text-destructive">
                {shiftStartState.fieldErrors.startingAmount}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Adjustments</Label>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAdjustment}
                >
                  <Plus className="size-4" />
                  Add Adjustment
                </Button>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="w-12 px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Adjustment Name
                    </th>
                    <th className="w-40 px-3 py-2 text-left font-medium">
                      Amount
                    </th>
                    {canManage ? (
                      <th className="w-12 px-3 py-2 text-right font-medium" />
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adjustment, index) => (
                    <tr key={adjustment.id} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          id={`adjustment-name-${adjustment.id}`}
                          name="adjustmentName"
                          value={adjustment.name}
                          onChange={(event) =>
                            updateAdjustment(
                              adjustment.id,
                              "name",
                              event.target.value
                            )
                          }
                          readOnly={!canManage}
                          placeholder="Tips, overpayment, cash added"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          id={`adjustment-amount-${adjustment.id}`}
                          name="adjustmentAmount"
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={adjustment.amount}
                          onChange={(event) =>
                            updateAdjustment(
                              adjustment.id,
                              "amount",
                              event.target.value
                            )
                          }
                          readOnly={!canManage}
                        />
                      </td>
                      {canManage ? (
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeAdjustment(adjustment.id)}
                            aria-label={`Remove adjustment ${index + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/30">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right font-medium">
                      Total Adjustments
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {formatCurrency(adjustmentTotal)}
                    </td>
                    {canManage ? <td /> : null}
                  </tr>
                </tfoot>
              </table>
            </div>

            {shiftStartState.fieldErrors?.adjustments ? (
              <p className="text-sm text-destructive">
                {shiftStartState.fieldErrors.adjustments}
              </p>
            ) : null}
          </div>

          {shiftStartState.error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {shiftStartState.error}
            </p>
          ) : null}

          {canManage ? (
            <Button type="submit" disabled={isShiftStartPending}>
              <Save className="size-4" />
              {isShiftStartPending ? "Saving..." : "Save Shift Start"}
            </Button>
          ) : null}
        </form>

        <form
          action={shiftEndAction}
          className="grid content-start gap-4 rounded-lg border p-4"
        >
          <input type="hidden" name="businessDate" value={businessDate} />
          <div>
            <h2 className="text-lg font-semibold">Shift End</h2>
            <p className="text-sm text-muted-foreground">
              Close the drawer and carry tomorrow&apos;s opening cash forward.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cashOnHand">Cash on Hand</Label>
              <Input
                id="cashOnHand"
                name="cashOnHand"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={cashOnHand}
                onChange={(event) => setCashOnHand(event.target.value)}
                readOnly={!canManage}
                required
              />
              {shiftEndState.fieldErrors?.cashOnHand ? (
                <p className="text-sm text-destructive">
                  {shiftEndState.fieldErrors.cashOnHand}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="openingCashForTomorrow">
                Opening Cash for Tomorrow
              </Label>
              <Input
                id="openingCashForTomorrow"
                name="openingCashForTomorrow"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={openingCashForTomorrow}
                onChange={(event) =>
                  setOpeningCashForTomorrow(event.target.value)
                }
                readOnly={!canManage}
                required
              />
              {shiftEndState.fieldErrors?.openingCashForTomorrow ? (
                <p className="text-sm text-destructive">
                  {shiftEndState.fieldErrors.openingCashForTomorrow}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Cash added to bank</span>
              <span className="font-semibold">{formatCurrency(cashToBank)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cash on hand minus opening cash for tomorrow.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={summary.notes}
              readOnly={!canManage}
              placeholder="Optional shift-end notes"
            />
          </div>

          {shiftEndState.error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {shiftEndState.error}
            </p>
          ) : null}

          {canManage ? (
            <Button type="submit" disabled={isShiftEndPending}>
              <Save className="size-4" />
              {isShiftEndPending ? "Saving..." : "Save Shift End"}
            </Button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
