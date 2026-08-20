import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageLoyalty } from "@/lib/loyalty-access";
import { normalizePhoneNumber } from "@/lib/loyalty";
import {
  LoyaltyClient,
  type LoyaltyCustomerRow,
  type LoyaltyTransactionRow,
} from "@/components/loyalty/loyalty-client";

export default async function LoyaltyPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canManageLoyalty(session.user)) redirect("/dashboard");

  const params = await searchParams;
  const query = Array.isArray(params?.q) ? params.q[0] : params?.q ?? "";
  const trimmedQuery = query.trim();
  const normalizedPhoneQuery = normalizePhoneNumber(trimmedQuery);
  const where =
    trimmedQuery.length > 0
      ? {
          OR: [
            { displayName: { contains: trimmedQuery } },
            ...(normalizedPhoneQuery
              ? [{ phoneNumber: { contains: normalizedPhoneQuery } }]
              : []),
          ],
        }
      : {};

  const [customers, transactions] = await Promise.all([
    db.customer.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: [{ loyaltyPoints: "desc" }, { updatedAt: "desc" }],
      take: 100,
    }),
    db.loyaltyTransaction.findMany({
      include: {
        customer: { select: { displayName: true, phoneNumber: true } },
        order: { select: { orderNumber: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const customerRows: LoyaltyCustomerRow[] = customers.map((customer) => ({
    id: customer.id,
    displayName: customer.displayName,
    phoneNumber: customer.phoneNumber,
    loyaltyPoints: customer.loyaltyPoints,
    lifetimePoints: customer.lifetimePoints,
    redeemedPoints: customer.redeemedPoints,
    orderCount: customer._count.orders,
    lastOrderAt: customer.lastOrderAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
  }));

  const transactionRows: LoyaltyTransactionRow[] = transactions.map((transaction) => ({
    id: transaction.id,
    customerName: transaction.customer.displayName,
    phoneNumber: transaction.customer.phoneNumber,
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
          Manage customer stamps by cellphone number and redeem free rewards.
        </p>
      </div>
      <LoyaltyClient
        customers={customerRows}
        transactions={transactionRows}
        query={trimmedQuery}
      />
    </div>
  );
}
