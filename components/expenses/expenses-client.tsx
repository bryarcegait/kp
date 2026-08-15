"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, ImageOff, CalendarDays, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ExpenseForm, type ExpenseFormValues } from "./expense-form";
import { deleteExpense } from "@/app/(app)/expenses/actions";
import { formatCurrency, formatDate } from "@/lib/format";

export type ExpenseRow = ExpenseFormValues & {
  createdAt: string;
  createdByName: string;
};

export function ExpensesClient({
  expenses,
  selectedDate,
  canCreate,
  canEdit,
  canDelete,
  canViewAll,
}: {
  expenses: ExpenseRow[];
  selectedDate: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewAll: boolean;
}) {
  const [dialogTarget, setDialogTarget] = useState<"new" | ExpenseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  function handleDelete() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      const result = await deleteExpense(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Expense deleted");
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {expenses.length} {expenses.length === 1 ? "entry" : "entries"} · Total{" "}
            <span className="font-medium text-foreground">{formatCurrency(total)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action="/expenses" className="flex items-center gap-2">
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
          {canCreate ? (
            <Button onClick={() => setDialogTarget("new")}>
              <Plus className="size-4" /> Add Expense
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="hidden md:table-cell">Remarks</TableHead>
              <TableHead className="hidden sm:table-cell">Receipt</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              {canViewAll ? <TableHead className="hidden lg:table-cell">Added by</TableHead> : null}
              {canEdit || canDelete ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No expenses yet.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.name}</TableCell>
                  <TableCell>{formatCurrency(expense.amount)}</TableCell>
                  <TableCell className="hidden max-w-64 truncate md:table-cell text-muted-foreground">
                    {expense.remarks || "—"}
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
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {formatDate(expense.createdAt)}
                  </TableCell>
                  {canViewAll ? (
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {expense.createdByName}
                    </TableCell>
                  ) : null}
                  {canEdit || canDelete ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit expense"
                            onClick={() => setDialogTarget(expense)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete expense"
                            onClick={() => setDeleteTarget(expense)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogTarget !== null} onOpenChange={(open) => !open && setDialogTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTarget === "new" ? "Add Expense" : "Edit Expense"}</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            key={dialogTarget === "new" ? "new" : dialogTarget?.id}
            expense={dialogTarget && dialogTarget !== "new" ? dialogTarget : null}
            onSuccess={() => {
              toast.success(dialogTarget === "new" ? "Expense added" : "Expense updated");
              setDialogTarget(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;. This action cannot be
              undone.
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
