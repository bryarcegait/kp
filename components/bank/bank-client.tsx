"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  FileText,
  ImageOff,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteBankExpense,
  recordDailyCashTransfer,
  setBankCurrentAmount,
  upsertBankExpense,
  type BankFormState,
} from "@/app/(app)/bank/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type BankExpenseRow = {
  id: string;
  businessDate: string;
  name: string;
  amount: string;
  remarks: string | null;
  receiptUrl: string | null;
  createdAt: string;
  createdByName: string;
};

export type BankLedgerRow = {
  id: string;
  type: string;
  businessDate: string | null;
  name: string;
  amount: string;
  remarks: string | null;
  receiptUrl: string | null;
  createdAt: string;
  createdByName: string;
};

const initialState: BankFormState = {};

function useFormToast(
  state: BankFormState,
  isPending: boolean,
  onSuccess?: () => void
) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.success) {
        toast.success(state.success);
        onSuccess?.();
      }
    }
    wasPending.current = isPending;
  }, [isPending, onSuccess, state.error, state.success]);
}

function BankExpenseForm({
  expense,
  selectedDate,
  onSuccess,
}: {
  expense?: BankExpenseRow | null;
  selectedDate: string;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    upsertBankExpense,
    initialState
  );
  useFormToast(state, isPending, onSuccess);

  return (
    <form action={formAction} className="grid gap-4">
      {expense ? <input type="hidden" name="id" value={expense.id} /> : null}
      <input
        type="hidden"
        name="businessDate"
        value={expense?.businessDate ?? selectedDate}
      />

      <div className="grid gap-2">
        <Label htmlFor="bank-expense-name">Name</Label>
        <Input
          id="bank-expense-name"
          name="name"
          placeholder="e.g. Chicken Wings Raw Material"
          defaultValue={expense?.name}
          required
        />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bank-expense-amount">Amount (₱)</Label>
        <Input
          id="bank-expense-amount"
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={expense ? Math.abs(Number(expense.amount)).toFixed(2) : ""}
          required
        />
        {state.fieldErrors?.amount ? (
          <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bank-expense-remarks">Remarks</Label>
        <Textarea
          id="bank-expense-remarks"
          name="remarks"
          placeholder="Optional notes"
          defaultValue={expense?.remarks ?? ""}
          rows={3}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bank-expense-receipt">Receipt</Label>
        <Input
          id="bank-expense-receipt"
          name="receipt"
          type="file"
          accept="image/*,.pdf"
        />
        {expense?.receiptUrl ? (
          <a
            href={expense.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-2"
          >
            <FileText className="size-3.5" /> Current receipt on file
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">
            Optional — image or PDF, up to 5MB.
          </p>
        )}
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : expense ? "Save expense" : "Add bank expense"}
      </Button>
    </form>
  );
}

function SetBankBalanceForm({ currentBalance }: { currentBalance: number }) {
  const [state, formAction, isPending] = useActionState(
    setBankCurrentAmount,
    initialState
  );
  useFormToast(state, isPending);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <div className="grid gap-2">
        <Label htmlFor="currentAmount">Current bank amount</Label>
        <Input
          id="currentAmount"
          name="currentAmount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          defaultValue={currentBalance.toFixed(2)}
          required
        />
        {state.fieldErrors?.currentAmount ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.currentAmount}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="self-end" disabled={isPending}>
        {isPending ? "Saving..." : "Save amount"}
      </Button>
    </form>
  );
}

function CashTransferForm({
  selectedDate,
  transferAmount,
  existingTransferAmount,
  canManage,
  canRecordCashTransfer,
}: {
  selectedDate: string;
  transferAmount: number;
  existingTransferAmount: number;
  canManage: boolean;
  canRecordCashTransfer: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    recordDailyCashTransfer,
    initialState
  );
  useFormToast(state, isPending);
  const hasExistingTransfer = existingTransferAmount > 0;

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="businessDate" value={selectedDate} />
      <Button
        type="submit"
        disabled={!canManage || !canRecordCashTransfer || isPending || transferAmount <= 0}
      >
        {isPending
          ? "Saving..."
          : hasExistingTransfer
            ? "Update bank transfer"
            : "Record bank transfer"}
      </Button>
      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {!canRecordCashTransfer ? (
        <p className="text-sm text-muted-foreground">
          Bank transfer recording starts tomorrow. Today&apos;s cash on hand will
          be used for tomorrow&apos;s transfer.
        </p>
      ) : null}
    </form>
  );
}

function entryTypeLabel(type: string) {
  if (type === "balance_adjustment") return "Balance";
  if (type === "cash_transfer") return "Cash Transfer";
  if (type === "bank_expense") return "Bank Expense";
  return type;
}

export function BankClient({
  selectedDate,
  currentBalance,
  yesterdayCashOnHand,
  todayStartingAmount,
  transferAmount,
  existingTransferAmount,
  bankExpenses,
  ledgerEntries,
  canManage,
  canSetCurrentAmount,
  canRecordCashTransfer,
}: {
  selectedDate: string;
  currentBalance: number;
  yesterdayCashOnHand: number;
  todayStartingAmount: number;
  transferAmount: number;
  existingTransferAmount: number;
  bankExpenses: BankExpenseRow[];
  ledgerEntries: BankLedgerRow[];
  canManage: boolean;
  canSetCurrentAmount: boolean;
  canRecordCashTransfer: boolean;
}) {
  const [dialogTarget, setDialogTarget] = useState<"new" | BankExpenseRow | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<BankExpenseRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const bankExpenseTotal = bankExpenses.reduce(
    (sum, expense) => sum + Math.abs(Number(expense.amount)),
    0
  );

  function handleDelete() {
    if (!deleteTarget) return;

    startDeleteTransition(async () => {
      const result = await deleteBankExpense(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Bank expense deleted");
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Current Bank</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(currentBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cash To Bank</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(transferAmount)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Yesterday cash on hand minus today starting cash
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bank Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(bankExpenseTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {bankExpenses.length} encoded for selected date
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Bank Controls</CardTitle>
              <CardDescription>
                Set the bank amount, then record cash moved from the drawer.
              </CardDescription>
            </div>
            <form action="/bank" className="flex items-center gap-2">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  name="date"
                  defaultValue={selectedDate}
                  className="h-8 w-[10.5rem] pl-8"
                />
              </div>
              <Button type="submit" variant="outline">
                <Search className="size-4" /> Filter
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Set Current Bank Amount</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this when starting or correcting the bank balance. It saves an
              adjustment row in the ledger.
            </p>
            {canSetCurrentAmount ? (
              <div className="mt-4">
                <SetBankBalanceForm currentBalance={currentBalance} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Only System Admin can set the current bank amount.
              </p>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Cash From Drawer</h3>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Yesterday cash on hand</span>
                <span className="font-medium">
                  {formatCurrency(yesterdayCashOnHand)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Today starting cash</span>
                <span className="font-medium">
                  - {formatCurrency(todayStartingAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t pt-2">
                <span className="font-medium">Amount added to bank</span>
                <span className="text-lg font-bold">
                  {formatCurrency(transferAmount)}
                </span>
              </div>
              {existingTransferAmount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Recorded amount for this date:{" "}
                  {formatCurrency(existingTransferAmount)}
                </p>
              ) : null}
            </div>
            <div className="mt-4">
              <CashTransferForm
                selectedDate={selectedDate}
                transferAmount={transferAmount}
                existingTransferAmount={existingTransferAmount}
                canManage={canManage}
                canRecordCashTransfer={canRecordCashTransfer}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Bank Expenses</CardTitle>
              <CardDescription>
                These subtract from the bank and are separate from the daily
                sales Expenses page.
              </CardDescription>
            </div>
            {canManage ? (
              <Button onClick={() => setDialogTarget("new")}>
                <Plus className="size-4" /> Add Bank Expense
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Remarks</TableHead>
                  <TableHead className="hidden sm:table-cell">Receipt</TableHead>
                  <TableHead className="hidden lg:table-cell">Added by</TableHead>
                  {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 6 : 5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No bank expenses for this date.
                    </TableCell>
                  </TableRow>
                ) : (
                  bankExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.name}</TableCell>
                      <TableCell>
                        {formatCurrency(Math.abs(Number(expense.amount)))}
                      </TableCell>
                      <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                        {expense.remarks || "-"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {expense.receiptUrl ? (
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                          >
                            <FileText className="size-4" /> View
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <ImageOff className="size-4" /> None
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {expense.createdByName}
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Edit bank expense"
                              onClick={() => setDialogTarget(expense)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete bank expense"
                              onClick={() => setDeleteTarget(expense)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Ledger</CardTitle>
          <CardDescription>
            Latest balance changes, drawer transfers, and bank expenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Added by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerEntries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No bank ledger entries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entryTypeLabel(entry.type)}</TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell
                        className={
                          Number(entry.amount) < 0
                            ? "text-destructive"
                            : "text-emerald-700 dark:text-emerald-400"
                        }
                      >
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {entry.businessDate
                          ? formatDate(entry.businessDate)
                          : formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {entry.createdByName}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={dialogTarget !== null}
        onOpenChange={(open) => !open && setDialogTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogTarget === "new" ? "Add Bank Expense" : "Edit Bank Expense"}
            </DialogTitle>
          </DialogHeader>
          <BankExpenseForm
            key={dialogTarget === "new" ? "new" : dialogTarget?.id}
            expense={dialogTarget && dialogTarget !== "new" ? dialogTarget : null}
            selectedDate={selectedDate}
            onSuccess={() => setDialogTarget(null)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bank expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot; from
              the bank ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
