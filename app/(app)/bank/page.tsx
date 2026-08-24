import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageBank, canViewBank } from "@/lib/bank-access";
import {
  formatDateOnly,
  getDateOnlyRange,
  parseInputDate,
} from "@/lib/dates";
import {
  BankClient,
  type BankExpenseRow,
  type BankLedgerRow,
} from "@/components/bank/bank-client";

export default async function BankPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string | string[] }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewBank(session.user)) redirect("/");

  const canManage = canManageBank(session.user);
  const params = await searchParams;
  const selectedDate = parseInputDate(
    Array.isArray(params?.date) ? params.date[0] : params?.date
  );
  const { start, end } = getDateOnlyRange(selectedDate);

  const [currentBalanceResult, bankExpenses, ledgerEntries] = await Promise.all([
    db.bankEntry.aggregate({ _sum: { amount: true } }),
    db.bankEntry.findMany({
      where: {
        entryType: "bank_expense",
        businessDate: { gte: start, lt: end },
      },
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.bankEntry.findMany({
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const bankExpenseRows: BankExpenseRow[] = bankExpenses.map((entry) => ({
    id: entry.id,
    businessDate: entry.businessDate
      ? formatDateOnly(entry.businessDate)
      : selectedDate,
    name: entry.name,
    amount: entry.amount.toString(),
    remarks: entry.remarks,
    receiptUrl: entry.receiptUrl,
    createdAt: entry.createdAt.toISOString(),
    createdByName: entry.createdBy.fullName,
  }));

  const ledgerRows: BankLedgerRow[] = ledgerEntries.map((entry) => ({
    id: entry.id,
    type: entry.entryType,
    businessDate: entry.businessDate
      ? formatDateOnly(entry.businessDate)
      : null,
    name: entry.name,
    amount: entry.amount.toString(),
    remarks: entry.remarks,
    receiptUrl: entry.receiptUrl,
    createdAt: entry.createdAt.toISOString(),
    createdByName: entry.createdBy.fullName,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bank</h1>
        <p className="text-muted-foreground">
          Track cash moved into the bank and expenses paid from the bank.
        </p>
      </div>
      <BankClient
        selectedDate={selectedDate}
        currentBalance={Number(currentBalanceResult._sum.amount ?? 0)}
        bankExpenses={bankExpenseRows}
        ledgerEntries={ledgerRows}
        canManage={canManage}
      />
    </div>
  );
}