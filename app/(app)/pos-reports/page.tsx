import { redirect } from "next/navigation";
import {
  Banknote,
  CreditCard,
  ReceiptText,
  ShoppingBag,
  Smartphone,
  Truck,
  WalletCards,
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getLoyverseTodayReport,
  LoyverseConfigError,
  type LoyverseTodayReport,
} from "@/lib/loyverse";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ReportUnavailable({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loyverse is not connected</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Add a Loyverse access token with `RECEIPTS_READ` and `PAYMENT_TYPES_READ`
          permissions to `LOYVERSE_ACCESS_TOKEN` in `.env`, then restart the app.
        </p>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Banknote;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

async function loadReport() {
  try {
    return { report: await getLoyverseTodayReport(), error: null };
  } catch (error) {
    if (error instanceof LoyverseConfigError) {
      return {
        report: null,
        error:
          "The app is ready, but it needs your Loyverse API token before it can pull POS reports.",
      };
    }

    return {
      report: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load the Loyverse POS report.",
    };
  }
}

export default async function PosReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { report, error } = await loadReport();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">POS Reports</h1>
        <p className="text-muted-foreground">
          Today&apos;s Loyverse payment totals by cash and card.
        </p>
      </div>

      {error || !report ? (
        <ReportUnavailable message={error ?? "Unable to load report."} />
      ) : (
        <ReportContent report={report} />
      )}
    </div>
  );
}

function ReportContent({ report }: { report: LoyverseTodayReport }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Net Sales"
          value={formatCurrency(report.netSales)}
          description="Total sales minus delivery fees"
          icon={ShoppingBag}
        />
        <SummaryCard
          title="Delivery Fee"
          value={formatCurrency(report.deliveryFeeTotal)}
          description="Delivery Fee line items"
          icon={Truck}
        />
        <SummaryCard
          title="Cash payments"
          value={formatCurrency(report.cashTotal)}
          description={`For ${report.date}`}
          icon={Banknote}
        />
        <SummaryCard
          title="Card payments"
          value={formatCurrency(report.cardTotal)}
          description={`For ${report.date}`}
          icon={CreditCard}
        />
        <SummaryCard
          title="GCash payments"
          value={formatCurrency(report.gcashTotal)}
          description={`For ${report.date}`}
          icon={Smartphone}
        />
        <SummaryCard
          title="Other payments"
          value={formatCurrency(report.otherTotal)}
          description="Checks, custom, or unmatched types"
          icon={WalletCards}
        />
        <SummaryCard
          title="Receipts"
          value={String(report.receiptCount)}
          description={`${report.paymentCount} payment records`}
          icon={ReceiptText}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Breakdown</CardTitle>
          <CardDescription>
            Totals are grouped by Loyverse payment type. Refund receipts are
            subtracted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No Loyverse payments found for today.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.payments.map((payment) => (
                    <TableRow key={`${payment.type}:${payment.label}`}>
                      <TableCell className="font-medium">
                        {payment.label}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {payment.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.count}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
