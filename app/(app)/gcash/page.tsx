import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageGcash } from "@/lib/gcash-access";
import { formatInputDate } from "@/lib/dates";
import {
  GcashClient,
  type GcashEntryRow,
} from "@/components/gcash/gcash-client";

export default async function GcashPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canManageGcash(session.user)) redirect("/");

  const [salesResult, entriesResult, entries, latestSale] = await Promise.all([
    db.dailyGcashSale.aggregate({ _sum: { gcashTotal: true } }),
    db.gcashEntry.aggregate({ _sum: { amount: true } }),
    db.gcashEntry.findMany({
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.dailyGcashSale.findFirst({ orderBy: { businessDate: "desc" } }),
  ]);

  const totalSales = Number(salesResult._sum.gcashTotal ?? 0);
  const totalDeducted = Number(entriesResult._sum.amount ?? 0);
  const balance = totalSales - totalDeducted;

  const entryRows: GcashEntryRow[] = entries.map((entry) => ({
    id: entry.id,
    entryType: entry.entryType,
    businessDate: entry.businessDate ? entry.businessDate.toISOString() : null,
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
        <h1 className="text-2xl font-semibold tracking-tight">GCash</h1>
        <p className="text-muted-foreground">
          Track the GCash wallet balance, remittances to admin, and supplies paid with GCash.
        </p>
      </div>
      <GcashClient
        balance={balance}
        totalSales={totalSales}
        totalDeducted={totalDeducted}
        entries={entryRows}
        lastSyncedDate={latestSale?.businessDate.toISOString() ?? null}
        todayDate={formatInputDate(new Date())}
      />
    </div>
  );
}
