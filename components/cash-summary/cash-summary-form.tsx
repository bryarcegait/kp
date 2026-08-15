"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  upsertCashSummary,
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
  notes: string;
};

const initialState: CashSummaryFormState = {};

export function CashSummaryForm({
  summary,
  canManage,
}: {
  summary: CashSummaryFormValues;
  canManage: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    upsertCashSummary,
    initialState
  );
  const [adjustments, setAdjustments] = useState(() =>
    summary.adjustments.length > 0
      ? summary.adjustments
      : [{ id: "new-0", name: "", amount: "" }]
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      toast.success("Cash summary saved");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

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

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="businessDate">Business Date</Label>
        <Input
          id="businessDate"
          name="businessDate"
          type="date"
          defaultValue={summary.businessDate}
          readOnly={!canManage}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="startingAmount">Starting Cash</Label>
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
          {state.fieldErrors?.startingAmount ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.startingAmount}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cashOnHand">Cash on Hand</Label>
          <Input
            id="cashOnHand"
            name="cashOnHand"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={summary.cashOnHand}
            readOnly={!canManage}
            required
          />
          {state.fieldErrors?.cashOnHand ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.cashOnHand}
            </p>
          ) : null}
        </div>
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

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="w-12 px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">
                  Adjustment Name
                </th>
                <th className="w-44 px-3 py-2 text-left font-medium">
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
                <td
                  colSpan={canManage ? 2 : 2}
                  className="px-3 py-2 text-right font-medium"
                >
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

        {state.fieldErrors?.adjustments ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.adjustments}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={summary.notes}
          readOnly={!canManage}
          placeholder="Optional notes for tips, overpayment, or other drawer adjustments"
        />
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      {canManage ? (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Cash Summary"}
        </Button>
      ) : null}
    </form>
  );
}
