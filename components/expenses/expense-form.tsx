"use client";

import { useActionState, useEffect, useRef } from "react";
import { upsertExpense, type ExpenseFormState } from "@/app/(app)/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

export type ExpenseFormValues = {
  id: string;
  name: string;
  amount: string;
  remarks: string | null;
  receiptUrl: string | null;
};

const initialState: ExpenseFormState = {};

export function ExpenseForm({
  expense,
  onSuccess,
}: {
  expense?: ExpenseFormValues | null;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(upsertExpense, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      onSuccess();
    }
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  return (
    <form action={formAction} className="grid gap-4">
      {expense ? <input type="hidden" name="id" value={expense.id} /> : null}

      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Market groceries"
          defaultValue={expense?.name}
          required
        />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount">Amount (₱)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={expense?.amount}
          required
        />
        {state.fieldErrors?.amount ? (
          <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea
          id="remarks"
          name="remarks"
          placeholder="Optional notes"
          defaultValue={expense?.remarks ?? ""}
          rows={3}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="receipt">Receipt</Label>
        <Input id="receipt" name="receipt" type="file" accept="image/*,.pdf" />
        {expense?.receiptUrl ? (
          <a
            href={expense.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-2"
          >
            <FileText className="size-3.5" /> Current receipt on file (upload a new one to
            replace it)
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">Optional — image or PDF, up to 5MB.</p>
        )}
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : expense ? "Save changes" : "Add expense"}
      </Button>
    </form>
  );
}
