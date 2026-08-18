import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/format";
import { formatInputDate, getLocalDateRange, toDateOnly } from "@/lib/dates";
import { calculateCashReconciliation } from "@/lib/cash-reconciliation";
import { canViewCashSummary as canViewCashSummaryForUser } from "@/lib/cash-summary-access";
import { getLoyverseTodayReport } from "@/lib/loyverse";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  CreditCard,
  Receipt,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const permissions = session?.user.permissions ?? [];
  const userId = session?.user.id;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const canViewAllExpenses = hasPermission(permissions, "expenses.view_all");
  const canViewExpenses = hasPermission(permissions, "expenses.view");
  const canViewUsers = hasPermission(permissions, "users.view");
  const canViewRoles = hasPermission(permissions, "roles.view");
  const canViewCashSummary = canViewCashSummaryForUser(session?.user);
  const today = formatInputDate(new Date());
  const { start: startOfToday, end: endOfToday } = getLocalDateRange(today);
  const todayDateOnly = toDateOnly(today);

  const expenseScope =
    canViewExpenses && !canViewAllExpenses && userId ? { createdById: userId } : {};

  const [
    monthTotal,
    monthCount,
    todayExpenses,
    userCount,
    roleCount,
    cashSummary,
    savedPosReport,
  ] = await Promise.all([
    canViewExpenses
      ? db.expense.aggregate({
          _sum: { amount: true },
          where: { ...expenseScope, createdAt: { gte: startOfMonth } },
        })
      : null,
    canViewExpenses
      ? db.expense.count({ where: { ...expenseScope, createdAt: { gte: startOfMonth } } })
      : null,
    canViewExpenses
      ? db.expense.aggregate({
          _sum: { amount: true },
          where: {
            ...expenseScope,
            createdAt: { gte: startOfToday, lt: endOfToday },
          },
        })
      : null,
    canViewUsers ? db.user.count({ where: { isActive: true } }) : null,
    canViewRoles ? db.role.count() : null,
    canViewCashSummary
      ? db.dailyCashSummary.findUnique({
          where: { businessDate: todayDateOnly },
        })
      : null,
    canViewCashSummary
      ? db.dailyPosReport.findUnique({
          where: { businessDate: todayDateOnly },
        })
      : null,
  ]);

  const loyverseResult =
    canViewCashSummary && !savedPosReport
      ? await getLoyverseTodayReport()
          .then((report) => ({ report, error: null }))
          .catch((error) => ({
            report: null,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load Loyverse report.",
          }))
      : null;

  const posReport =
    savedPosReport ??
    (loyverseResult?.report
      ? {
          grossSales: loyverseResult.report.grossSales,
          deliveryFeeTotal: loyverseResult.report.deliveryFeeTotal,
          netSales: loyverseResult.report.netSales,
          cashTotal: loyverseResult.report.cashTotal,
          cardTotal: loyverseResult.report.cardTotal,
        }
      : null);
  const posReportSource = savedPosReport ? "Saved POS snapshot" : "Live Loyverse";

  const reconciliation =
    canViewCashSummary && posReport
      ? calculateCashReconciliation({
          startingAmount: Number(cashSummary?.startingAmount ?? 0),
          cashSales: Number(posReport.cashTotal),
          gcashSales: Number(posReport.cardTotal),
          expenses: Number(todayExpenses?._sum.amount ?? 0),
          adjustments: Number(cashSummary?.adjustments ?? 0),
          cashOnHand: Number(cashSummary?.cashOnHand ?? 0),
        })
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {session?.user.name}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening at Kanto&apos;t Pakpakan.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canViewExpenses ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses this month</CardTitle>
              <Receipt className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(monthTotal?._sum.amount?.toString() ?? 0)}
              </div>
              <CardDescription>{monthCount ?? 0} entries logged</CardDescription>
            </CardContent>
          </Card>
        ) : null}

        {canViewUsers ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active users</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCount}</div>
              <CardDescription>Currently able to sign in</CardDescription>
            </CardContent>
          </Card>
        ) : null}

        {canViewRoles ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Roles configured</CardTitle>
              <ShieldCheck className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleCount}</div>
              <CardDescription>System Admin, Manager, Staff, and any custom roles</CardDescription>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {canViewCashSummary ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Today&apos;s Cash Reconciliation</CardTitle>
                <CardDescription>
                  POS cash and GCash come from Loyverse. Expenses come from the
                  Expenses page.
                </CardDescription>
              </div>
              {reconciliation ? (
                <Badge
                  variant={
                    reconciliation.status === "balanced"
                      ? "secondary"
                      : reconciliation.status === "over"
                        ? "default"
                        : "destructive"
                  }
                  className="capitalize"
                >
                  {reconciliation.status}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {loyverseResult?.error ? (
              <p className="text-sm text-destructive">{loyverseResult.error}</p>
            ) : reconciliation && posReport ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DashboardMetric
                    title="Net Sales"
                    value={formatCurrency(Number(posReport.netSales))}
                    icon={ShoppingBag}
                    note={posReportSource}
                  />
                  <DashboardMetric
                    title="Delivery Fee"
                    value={formatCurrency(Number(posReport.deliveryFeeTotal))}
                    icon={Truck}
                    note={posReportSource}
                  />
                  <DashboardMetric
                    title="Starting Cash"
                    value={formatCurrency(reconciliation.startingAmount)}
                    icon={Wallet}
                  />
                  <DashboardMetric
                    title="POS Cash Sales"
                    value={formatCurrency(reconciliation.cashSales)}
                    icon={Banknote}
                  />
                  <DashboardMetric
                    title="GCash / Card Sales"
                    value={formatCurrency(reconciliation.gcashSales)}
                    icon={CreditCard}
                  />
                  <DashboardMetric
                    title="Adjustments"
                    value={formatCurrency(reconciliation.adjustments)}
                    icon={Scale}
                  />
                  <DashboardMetric
                    title="Expenses"
                    value={formatCurrency(reconciliation.expenses)}
                    icon={Receipt}
                  />
                  <DashboardMetric
                    title="Cash on Hand"
                    value={formatCurrency(reconciliation.cashOnHand)}
                    icon={Banknote}
                  />
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="grid gap-3">
                    <SummaryLine
                      label="Net cash movement"
                      value={formatCurrency(reconciliation.netCashMovement)}
                    />
                    <SummaryLine
                      label="Expected cash on hand"
                      value={formatCurrency(reconciliation.expectedCashOnHand)}
                    />
                    <SummaryLine
                      label="Actual cash on hand"
                      value={formatCurrency(reconciliation.cashOnHand)}
                    />
                    <div className="border-t pt-3">
                      <SummaryLine
                        label="Cashier variance"
                        value={formatCurrency(reconciliation.variance)}
                        strong
                      />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Balanced when Cash on Hand equals Starting Cash + POS
                        Cash Sales + Adjustments - Expenses.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No cash summary data available yet.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function DashboardMetric({
  title,
  value,
  icon: Icon,
  note,
}: {
  title: string;
  value: string;
  icon: typeof Receipt;
  note?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-lg font-semibold">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function SummaryLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={strong ? "text-lg font-semibold" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
