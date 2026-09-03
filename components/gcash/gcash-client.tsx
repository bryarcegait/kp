"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, ImageOff, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  deleteGcashEntry,
  syncGcashSales,
  upsertGcashEntry,
  type GcashFormState,
} from "@/app/(app)/gcash/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export type GcashEntryRow = {
  id: string;
  entryType: string;
  businessDate: string | null;
  name: string;
  amount: string;
  remarks: string | null;
  receiptUrl: string;
  createdAt: string;
  createdByName: string;
};

const initialState: GcashFormState = {};

function entryTypeLabel(type: string) {
  if (type === "remittance") return "Remitted to Admin";
  if (type === "expense") return "Paid for Supplies";
  return type;
}

function useFormToast(
  state: GcashFormState,
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

function GcashEntryForm({
  entry,
  todayDate,
  onSuccess,
}: {
  entry?: GcashEntryRow | null;
  todayDate: string;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(upsertGcashEntry, initialState);
  const [entryType, setEntryType] = useState(entry?.entryType ?? "remittance");
  useFormToast(state, isPending, onSuccess);

  return (
    <form action={formAction} className="grid gap-4">
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <input type="hidden" name="entryType" value={entryType} />
      <input
        type="hidden"
        name="businessDate"
        value={entry?.businessDate?.slice(0, 10) ?? todayDate}
      />

      <div className="grid gap-2">
        <Label>Type</Label>
        <Select value={entryType} onValueChange={setEntryType}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="remittance">Remitted to Admin</SelectItem>
            <SelectItem value="expense">Paid for Supplies</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="gcash-entry-name">
          {entryType === "remittance" ? "Remitted by / notes" : "What was purchased"}
        </Label>
        <Input
          id="gcash-entry-name"
          name="name"
          placeholder={
            entryType === "remittance" ? "e.g. Aldrin Barrion" : "e.g. Chicken supplies"
          }
          defaultValue={entry?.name}
          required
        />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="gcash-entry-amount">Amount (₱)</Label>
        <Input
          id="gcash-entry-amount"
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={entry ? Math.abs(Number(entry.amount)).toFixed(2) : ""}
          required
        />
        {state.fieldErrors?.amount ? (
          <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="gcash-entry-remarks">Remarks</Label>
        <Textarea
          id="gcash-entry-remarks"
          name="remarks"
          placeholder="Optional notes"
          defaultValue={entry?.remarks ?? ""}
          rows={3}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="gcash-entry-receipt">GCash receipt</Label>
        <Input
          id="gcash-entry-receipt"
          name="receipt"
          type="file"
          accept="image/*,.pdf"
        />
        {entry?.receiptUrl ? (
          <a
            href={entry.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-2"
          >
            <FileText className="size-3.5" /> Current receipt on file — upload a new one to
            replace it
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">
            Required — image or PDF, up to 5MB.
          </p>
        )}
        {state.fieldErrors?.receipt ? (
          <p className="text-sm text-destructive">{state.fieldErrors.receipt}</p>
        ) : null}
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : entry ? "Save entry" : "Add entry"}
      </Button>
    </form>
  );
}

export function GcashClient({
  balance,
  totalSales,
  totalDeducted,
  entries,
  lastSyncedDate,
  todayDate,
}: {
  balance: number;
  totalSales: number;
  totalDeducted: number;
  entries: GcashEntryRow[];
  lastSyncedDate: string | null;
  todayDate: string;
}) {
  const [dialogTarget, setDialogTarget] = useState<"new" | GcashEntryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GcashEntryRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;

    startDeleteTransition(async () => {
      const result = await deleteGcashEntry(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("GCash entry deleted");
      }
      setDeleteTarget(null);
    });
  }

  function handleSync() {
    startSyncTransition(async () => {
      const formData = new FormData();
      formData.set("businessDate", todayDate);
      const result = await syncGcashSales(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Synced today's GCash sales from Loyverse.");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">GCash Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lastSyncedDate
                ? `Sales last synced ${formatDate(lastSyncedDate)}`
                : "No GCash sales synced yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total GCash Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalSales)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Synced from Loyverse</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Remitted &amp; Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalDeducted)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entries.length} entries logged
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>GCash Ledger</CardTitle>
              <CardDescription>
                Remittances to admin and supply expenses paid with GCash, each with a receipt.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />
                Sync Today&apos;s Sales
              </Button>
              <Button onClick={() => setDialogTarget("new")}>
                <Plus className="size-4" /> Add Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Remarks</TableHead>
                  <TableHead className="hidden sm:table-cell">Receipt</TableHead>
                  <TableHead className="hidden lg:table-cell">Added by</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No GCash entries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entryTypeLabel(entry.entryType)}</TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="text-destructive">
                        -{formatCurrency(Math.abs(Number(entry.amount)))}
                      </TableCell>
                      <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                        {entry.remarks || "-"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {entry.receiptUrl ? (
                          <a
                            href={entry.receiptUrl}
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
                        {entry.createdByName}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit GCash entry"
                            onClick={() => setDialogTarget(entry)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete GCash entry"
                            onClick={() => setDeleteTarget(entry)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
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
              {dialogTarget === "new" ? "Add GCash Entry" : "Edit GCash Entry"}
            </DialogTitle>
          </DialogHeader>
          <GcashEntryForm
            key={dialogTarget === "new" ? "new" : dialogTarget?.id}
            entry={dialogTarget && dialogTarget !== "new" ? dialogTarget : null}
            todayDate={todayDate}
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
            <AlertDialogTitle>Delete this GCash entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot; from the GCash
              ledger.
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
