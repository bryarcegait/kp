"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createLoyverseReceiptForOrder, LoyverseConfigError } from "@/lib/loyverse";
import { canManageOrders } from "@/lib/orders-access";

const sendOrderSchema = z.object({
  orderId: z.string().min(1),
});

export type SendOrderState = {
  error?: string;
  success?: string;
};

async function requireOrdersManager() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;
  if (!canManageOrders(session.user)) {
    return { error: "You don't have permission to manage orders." } as const;
  }
  return { session } as const;
}

function revalidateOrders() {
  revalidatePath("/orders");
}

export async function sendSilogOrderToLoyverse(
  _prevState: SendOrderState,
  formData: FormData
): Promise<SendOrderState> {
  const guard = await requireOrdersManager();
  if ("error" in guard) return { error: guard.error };

  const parsed = sendOrderSchema.safeParse({
    orderId: formData.get("orderId"),
  });

  if (!parsed.success) return { error: "Order not found." };

  const order = await db.customerOrder.findUnique({
    where: { id: parsed.data.orderId },
    include: { items: true },
  });

  if (!order) return { error: "Order not found." };
  if (order.loyverseReceiptNumber) {
    return { success: `Already sent to Loyverse as ${order.loyverseReceiptNumber}.` };
  }

  const productIds = Array.from(new Set(order.items.map((item) => item.productId)));
  const products = await db.menuProduct.findMany({
    where: { id: { in: productIds } },
    select: { id: true, category: true },
  });
  const categoriesByProductId = new Map(
    products.map((product) => [product.id, product.category])
  );
  const isSilogOnly =
    order.items.length > 0 &&
    order.items.every((item) => categoriesByProductId.get(item.productId) === "Silog");

  if (!isSilogOnly) {
    return { error: "Only Silog-only orders can be sent to Loyverse in this pilot." };
  }

  try {
    const receiptNumber = await createLoyverseReceiptForOrder({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      paymentMethod: order.paymentMethod as "cash" | "gcash" | "bank-transfer",
      scheduledFor: order.scheduledFor,
      orderType: order.orderType,
      customerNote: order.customerNote,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    });

    await db.customerOrder.update({
      where: { id: order.id },
      data: {
        status: "sent_to_loyverse",
        loyverseReceiptNumber: receiptNumber,
        loyverseSyncedAt: new Date(),
        loyverseSyncError: null,
        loyverseSentById: guard.session.user.id,
      },
    });

    revalidateOrders();
    return { success: `Order sent to Loyverse as ${receiptNumber}.` };
  } catch (error) {
    const message =
      error instanceof LoyverseConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to send order to Loyverse.";

    await db.customerOrder.update({
      where: { id: order.id },
      data: { loyverseSyncError: message },
    });

    revalidateOrders();
    return { error: message };
  }
}
