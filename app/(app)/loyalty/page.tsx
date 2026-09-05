import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canAwardLoyalty,
  canManageLoyalty,
  canViewLoyaltyCustomers,
} from "@/lib/loyalty-access";
import { getLoyaltyRewards, getLoyaltySpendPerStamp } from "@/lib/loyalty";
import {
  LoyaltyClient,
  type LoyaltyCustomerRow,
  type LoyaltyTransactionRow,
} from "@/components/loyalty/loyalty-client";

export default async function LoyaltyPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[]; tab?: string | string[] }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const canManage = canManageLoyalty(session.user);
  const canAward = canAwardLoyalty(session.user);
  const canViewCustomers = canViewLoyaltyCustomers(session.user);
  if (!canAward && !canViewCustomers) redirect("/dashboard");

  const params = await searchParams;
  const query = Array.isArray(params?.q) ? params.q[0] : params?.q ?? "";
  const trimmedQuery = query.trim();
  const requestedTab = Array.isArray(params?.tab) ? params.tab[0] : params?.tab;
  const defaultTab =
    requestedTab === "settings" && canManage
      ? "settings"
      : (requestedTab === "customers" || trimmedQuery.length > 0) && canViewCustomers
        ? "customers"
        : canAward
          ? "scan"
          : "customers";

  const [customers, transactions, rewardTiers, spendPerStamp] = await Promise.all([
    canViewCustomers
      ? db.customer.findMany({
          include: { _count: { select: { orders: true } } },
          orderBy: [{ loyaltyPoints: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    canViewCustomers
      ? db.loyaltyTransaction.findMany({
          include: {
            customer: { select: { displayName: true, email: true } },
            order: { select: { orderNumber: true } },
            createdBy: { select: { fullName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 120,
        })
      : Promise.resolve([]),
    getLoyaltyRewards(),
    getLoyaltySpendPerStamp(),
  ]);

  const customerRows: LoyaltyCustomerRow[] = customers.map((customer) => ({
    id: customer.id,
    displayName: customer.displayName,
    email: customer.email,
    phoneNumber: customer.phoneNumber,
    loyaltyPoints: customer.loyaltyPoints,
    lifetimePoints: customer.lifetimePoints,
    redeemedPoints: customer.redeemedPoints,
    pendingStampAmount: Number(customer.pendingStampAmount),
    orderCount: customer._count.orders,
    lastOrderAt: customer.lastOrderAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
  }));

  const transactionRows: LoyaltyTransactionRow[] = transactions.map((transaction) => ({
    id: transaction.id,
    customerName: transaction.customer.displayName,
    email: transaction.customer.email,
    orderNumber: transaction.order?.orderNumber ?? null,
    type: transaction.type,
    points: transaction.points,
    balanceAfter: transaction.balanceAfter,
    rewardName: transaction.rewardName,
    remarks: transaction.remarks,
    createdByName: transaction.createdBy?.fullName ?? null,
    createdAt: transaction.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Loyalty Cards</h1>
        <p className="text-muted-foreground">
          Scan customer QR codes to award stamps, manage accounts, and redeem free rewards.
        </p>
      </div>
      <LoyaltyClient
        customers={customerRows}
        transactions={transactionRows}
        query={trimmedQuery}
        rewardTiers={rewardTiers}
        spendPerStamp={spendPerStamp}
        canManage={canManage}
        canAward={canAward}
        canViewCustomers={canViewCustomers}
        defaultTab={defaultTab}
      />
    </div>
  );
}
