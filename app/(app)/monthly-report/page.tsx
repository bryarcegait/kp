import { redirect } from "next/navigation";
import {
  ArrowDownUp,
  Banknote,
  CalendarDays,
  CreditCard,
  Landmark,
  Receipt,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateCashReconciliation } from "@/lib/cash-reconciliation";
import { addInputDateDays, formatDateOnly, toDateOnly } from "@/lib/dates";
import { formatCurrency, formatDate } from "@/lib/format";
import { canViewMonthlyReport } from "@/lib/monthly-report-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortKey =
  | "date-desc"
  | "date-asc"
  | "net-sales-desc"
  | "expenses-desc"
  | "actual-cash-desc"
  | "variance-desc";

type MonthlyRow = {
  date: string;
  grossSales: number;
  deliveryFee: number;
  netSales: number;
  posCash: number;
  posCard: number;
  posOther: number;
  receiptCount: number;
  paymentCount: number;
  expenses: number;
  startingCash: number;
  adjustments: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  varianceStatus: "balanced" | "over" | "short";
  cashToBank: number;
  bankExpenses: number;
  bankNet: number;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "net-sales-desc", label: "Highest net sales" },
  { value: "expenses-desc", label: "Highest expenses" },
  { value: "actual-cash-desc", label: "Highest actual cash" },
  { value: "variance-desc", label: "Largest variance" },
];

const manilaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parseMonth(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function parseSort(value: unknown): SortKey {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as SortKey)
    : "date-desc";
}

function getMonthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const nextMonthDate =
    monthNumber === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;

  return {
    startDate,
    nextMonthDate,
    businessStart: toDateOnly(startDate),
    businessEnd: toDateOnly(nextMonthDate),
    manilaStart: new Date(Date.UTC(year, monthNumber - 1, 1, -8)),
    manilaEnd: new Date(Date.UTC(monthNumber === 12 ? year + 1 : year, monthNumber === 12 ? 0 : monthNumber, 1, -8)),
  };
}

function getManilaDateKey(date: Date) {
  return manilaDateFormatter.format(date);
}

function buildDateKeys(startDate: string, nextMonthDate: string) {
  const dates: string[] = [];
  let cursor = startDate;

  while (cursor < nextMonthDate) {
    dates.push(cursor);
    cursor = addInputDateDays(cursor, 1);
  }

  return dates;
}

function addToMap(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function sortRows(rows: MonthlyRow[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "date-asc") return a.date.localeCompare(b.date);
    if (sort === "net-sales-desc") return b.netSales - a.netSales;
    if (sort === "expenses-desc") return b.expenses - a.expenses;
    if (sort === "actual-cash-desc") return b.actualCash - a.actualCash;
    if (sort === "variance-desc") return Math.abs(b.variance) - Math.abs(a.variance);
    return b.date.localeCompare(a.date);
  });
}

function sumRows(rows: MonthlyRow[], key: keyof MonthlyRow) {
  return rows.reduce((sum, row) => sum + Number(row[key]), 0);
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string | string[]; sort?: string | string[] }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewMonthlyReport(session.user)) redirect("/dashboard");

  const params = await searchParams;
  const selectedMonth = parseMonth(
    Array.isArray(params?.month) ? params.month[0] : params?.month
  );
  const selectedSort = parseSort(
    Array.isArray(params?.sort) ? params.sort[0] : params?.sort
  );
  const { startDate, nextMonthDate, businessStart, businessEnd, manilaStart, manilaEnd } =
    getMonthBounds(selectedMonth);
  const dateKeys = buildDateKeys(startDate, nextMonthDate);

  const [posReports, cashSummaries, expenses, bankEntries] = await Promise.all([
    db.dailyPosReport.findMany({
      where: { businessDate: { gte: businessStart, lt: businessEnd } },
      orderBy: { businessDate: "asc" },
    }),
    db.dailyCashSummary.findMany({
      where: { businessDate: { gte: businessStart, lt: businessEnd } },
      orderBy: { businessDate: "asc" },
    }),
    db.expense.findMany({
      where: { createdAt: { gte: manilaStart, lt: manilaEnd } },
      select: { amount: true, createdAt: true },
    }),
    db.bankEntry.findMany({
      where: {
        businessDate: { gte: businessStart, lt: businessEnd },
        entryType: { in: ["cash_transfer", "bank_expense"] },
      },
      select: { entryType: true, amount: true, businessDate: true },
    }),
  ]);

  const posByDate = new Map(
    posReports.map((report) => [formatDateOnly(report.businessDate), report])
  );
  const cashByDate = new Map(
    cashSummaries.map((summary) => [formatDateOnly(summary.businessDate), summary])
  );
  const expensesByDate = new Map<string, number>();
  const cashToBankByDate = new Map<string, number>();
  const bankExpensesByDate = new Map<string, number>();

  for (const expense of expenses) {
    addToMap(expensesByDate, getManilaDateKey(expense.createdAt), Number(expense.amount));
  }

  for (const entry of bankEntries) {
    if (!entry.businessDate) continue;
    const key = formatDateOnly(entry.businessDate);
    if (entry.entryType === "cash_transfer") {
      addToMap(cashToBankByDate, key, Number(entry.amount));
    }
    if (entry.entryType === "bank_expense") {
      addToMap(bankExpensesByDate, key, Math.abs(Number(entry.amount)));
    }
  }

  const rows = dateKeys.map<MonthlyRow>((date) => {
    const pos = posByDate.get(date);
    const cash = cashByDate.get(date);
    const expensesTotal = expensesByDate.get(date) ?? 0;
    const reconciliation = calculateCashReconciliation({
      startingAmount: Number(cash?.startingAmount ?? 0),
      cashSales: Number(pos?.cashTotal ?? 0),
      gcashSales: Number(pos?.cardTotal ?? 0),
      expenses: expensesTotal,
      adjustments: Number(cash?.adjustments ?? 0),
      cashOnHand: Number(cash?.cashOnHand ?? 0),
    });
    const cashToBank = cashToBankByDate.get(date) ?? 0;
    const bankExpenses = bankExpensesByDate.get(date) ?? 0;

    return {
      date,
      grossSales: Number(pos?.grossSales ?? 0),
      deliveryFee: Number(pos?.deliveryFeeTotal ?? 0),
      netSales: Number(pos?.netSales ?? 0),
      posCash: Number(pos?.cashTotal ?? 0),
      posCard: Number(pos?.cardTotal ?? 0),
      posOther: Number(pos?.otherTotal ?? 0),
      receiptCount: Number(pos?.receiptCount ?? 0),
      paymentCount: Number(pos?.paymentCount ?? 0),
      expenses: expensesTotal,
      startingCash: reconciliation.startingAmount,
      adjustments: reconciliation.adjustments,
      expectedCash: reconciliation.expectedCashOnHand,
      actualCash: reconciliation.cashOnHand,
      variance: reconciliation.variance,
      varianceStatus: reconciliation.status,
      cashToBank,
      bankExpenses,
      bankNet: cashToBank - bankExpenses,
    };
  });
  const sortedRows = sortRows(rows, selectedSort);
  const latestActualCash = [...rows].reverse().find((row) => row.actualCash > 0)?.actualCash ?? 0;
  const totalNetSales = sumRows(rows, "netSales");
  const totalExpenses = sumRows(rows, "expenses");
  const totalVariance = sumRows(rows, "variance");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monthly Report</h1>
          <p className="text-muted-foreground">
            Daily POS, cash reconciliation, expenses, and bank movement.
          </p>
        </div>
        <form action="/monthly-report" className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="month"
              name="month"
              defaultValue={selectedMonth}
              className="h-9 w-40 pl-8"
            />
          </div>
          <Select name="sort" defaultValue={selectedSort}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline">
            <ArrowDownUp className="size-4" />
            Apply
          </Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ReportMetric title="Net Sales" value={formatCurrency(totalNetSales)} icon={ShoppingBag} />
        <ReportMetric title="POS Cash" value={formatCurrency(sumRows(rows, "posCash"))} icon={Banknote} />
        <ReportMetric title="POS Card" value={formatCurrency(sumRows(rows, "posCard"))} icon={CreditCard} />
        <ReportMetric title="Expenses" value={formatCurrency(totalExpenses)} icon={Receipt} />
        <ReportMetric title="Ending Cash" value={formatCurrency(latestActualCash)} icon={Wallet} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span>Daily Breakdown</span>
            <Badge variant={Math.abs(totalVariance) < 0.01 ? "secondary" : "outline"}>
              Month variance {formatCurrency(totalVariance)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-28">Date</TableHead>
                  <TableHead>Net Sales</TableHead>
                  <TableHead>POS Cash</TableHead>
                  <TableHead>POS Card</TableHead>
                  <TableHead>Other</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Start Cash</TableHead>
                  <TableHead>Adjustments</TableHead>
                  <TableHead>Expected Cash</TableHead>
                  <TableHead>Actual Cash</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Cash To Bank</TableHead>
                  <TableHead>Bank Expenses</TableHead>
                  <TableHead>Receipts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                    <TableCell>{formatCurrency(row.netSales)}</TableCell>
                    <TableCell>{formatCurrency(row.posCash)}</TableCell>
                    <TableCell>{formatCurrency(row.posCard)}</TableCell>
                    <TableCell>{formatCurrency(row.posOther)}</TableCell>
                    <TableCell>{formatCurrency(row.expenses)}</TableCell>
                    <TableCell>{formatCurrency(row.startingCash)}</TableCell>
                    <TableCell>{formatCurrency(row.adjustments)}</TableCell>
                    <TableCell>{formatCurrency(row.expectedCash)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(row.actualCash)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          row.varianceStatus === "short"
                            ? "font-medium text-destructive"
                            : row.varianceStatus === "over"
                              ? "font-medium text-emerald-700 dark:text-emerald-400"
                              : "text-muted-foreground"
                        }
                      >
                        {formatCurrency(row.variance)}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(row.cashToBank)}</TableCell>
                    <TableCell>{formatCurrency(row.bankExpenses)}</TableCell>
                    <TableCell>{row.receiptCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReportMetric
          title="Gross Sales"
          value={formatCurrency(sumRows(rows, "grossSales"))}
          icon={ShoppingBag}
          note="Before delivery fee subtraction"
        />
        <ReportMetric
          title="Delivery Fees"
          value={formatCurrency(sumRows(rows, "deliveryFee"))}
          icon={Receipt}
          note="Excluded from net sales"
        />
        <ReportMetric
          title="Bank Net"
          value={formatCurrency(sumRows(rows, "bankNet"))}
          icon={Landmark}
          note="Cash transfers minus bank expenses"
        />
      </div>
    </div>
  );
}

function ReportMetric({
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}
