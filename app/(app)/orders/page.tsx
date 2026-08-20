import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageOrders } from "@/lib/orders-access";
import {
  OrdersClient,
  type PendingOrderRow,
} from "@/components/orders/orders-client";

export default async function OrdersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canManageOrders(session.user)) redirect("/dashboard");

  const orders = await db.customerOrder.findMany({
    include: { items: true, loyverseSentBy: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const productIds = Array.from(
    new Set(orders.flatMap((order) => order.items.map((item) => item.productId)))
  );
  const products = await db.menuProduct.findMany({
    where: { id: { in: productIds } },
    select: { id: true, category: true },
  });
  const categoriesByProductId = new Map(
    products.map((product) => [product.id, product.category])
  );

  const rows: PendingOrderRow[] = orders
    .map((order) => {
      const itemRows = order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        category: categoriesByProductId.get(item.productId) ?? "Unknown",
      }));
      const isSilogOnly =
        itemRows.length > 0 && itemRows.every((item) => item.category === "Silog");

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        phoneNumber: order.phoneNumber,
        orderType: order.orderType,
        paymentMethod: order.paymentMethod,
        status: order.status,
        customerNote: order.customerNote,
        scheduledFor: order.scheduledFor.toISOString(),
        totalAmount: Number(order.totalAmount),
        loyverseReceiptNumber: order.loyverseReceiptNumber,
        loyverseSyncedAt: order.loyverseSyncedAt?.toISOString() ?? null,
        loyverseSyncError: order.loyverseSyncError,
        loyverseSentByName: order.loyverseSentBy?.fullName ?? null,
        isSilogOnly,
        items: itemRows,
      };
    })
    .filter((order) => order.isSilogOnly);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pending Orders</h1>
        <p className="text-muted-foreground">
          Silog-only online orders ready for manual Loyverse sending.
        </p>
      </div>
      <OrdersClient orders={rows} />
    </div>
  );
}
