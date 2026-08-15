import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { parseInputDate, toDateOnly } from "@/lib/dates";
import {
  canManageCashSummary,
  canViewCashSummary,
} from "@/lib/cash-summary-access";
import {
  CashSummaryForm,
  type CashSummaryFormValues,
} from "@/components/cash-summary/cash-summary-form";
import { SyncPosButton } from "@/components/cash-summary/sync-pos-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function CashSummaryPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string | string[] }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const canView = canViewCashSummary(session.user);
  if (!canView) redirect("/");

  const canManage = canManageCashSummary(session.user);
  const params = await searchParams;
  const selectedDate = parseInputDate(
    Array.isArray(params?.date) ? params.date[0] : params?.date
  );
  const businessDate = toDateOnly(selectedDate);

  const summary = await db.dailyCashSummary.findUnique({
    where: { businessDate },
    include: {
      updatedBy: { select: { fullName: true } },
      adjustmentItems: { orderBy: { createdAt: "asc" } },
    },
  });
  const posReport = await db.dailyPosReport.findUnique({
    where: { businessDate },
  });

  const adjustmentItems =
    summary?.adjustmentItems.length && summary.adjustmentItems.length > 0
      ? summary.adjustmentItems.map((item) => ({
          id: item.id,
          name: item.name,
          amount: item.amount.toString(),
        }))
      : Number(summary?.adjustments ?? 0) > 0
        ? [
            {
              id: "legacy-adjustment",
              name: "Adjustment",
              amount: summary?.adjustments.toString() ?? "0.00",
            },
          ]
        : [];
  const adjustmentTotal =
    adjustmentItems.length > 0
      ? adjustmentItems.reduce((sum, item) => sum + Number(item.amount), 0)
      : Number(summary?.adjustments ?? 0);

  const values: CashSummaryFormValues = {
    businessDate: selectedDate,
    startingAmount: summary?.startingAmount.toString() ?? "0.00",
    adjustments: adjustmentItems,
    cashOnHand: summary?.cashOnHand.toString() ?? "0.00",
    notes: summary?.notes ?? "",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Cash Summary
            </h1>
            <p className="text-muted-foreground">
              Enter the drawer starting cash, adjustments, and closing cash on
              hand.
            </p>
          </div>
          <SyncPosButton businessDate={selectedDate} canManage={canManage} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Drawer Inputs</CardTitle>
          <CardDescription>
            Adjustments are cash added to the register outside POS sales, such as
            tips or overpayment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CashSummaryForm summary={values} canManage={canManage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved POS Snapshot</CardTitle>
          <CardDescription>
            {posReport
              ? `Last synced at ${posReport.fetchedAt.toLocaleString("en-PH")}.`
              : "No Loyverse POS data has been synced for this date yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Net Sales</p>
            <p className="font-medium">
              {formatCurrency(posReport?.netSales.toString() ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Delivery Fee</p>
            <p className="font-medium">
              {formatCurrency(posReport?.deliveryFeeTotal.toString() ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Cash / GCash</p>
            <p className="font-medium">
              {formatCurrency(posReport?.cashTotal.toString() ?? 0)} /{" "}
              {formatCurrency(posReport?.cardTotal.toString() ?? 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Saved Values</CardTitle>
          <CardDescription>
            {summary
              ? `Last updated by ${summary.updatedBy.fullName}.`
              : "No cash summary has been saved for this date yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Starting Cash</p>
            <p className="font-medium">
              {formatCurrency(values.startingAmount)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Adjustments</p>
            <p className="font-medium">{formatCurrency(adjustmentTotal)}</p>
            {adjustmentItems.length > 0 ? (
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                {adjustmentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate">{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <p className="text-muted-foreground">Cash on Hand</p>
            <p className="font-medium">{formatCurrency(values.cashOnHand)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
