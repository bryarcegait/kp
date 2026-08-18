"use server";

import { z } from "zod";
import { getMenuItem } from "@/lib/customer-menu";
import { db } from "@/lib/db";

const orderTypeSchema = z.enum(["deliver", "pickup", "dine-in"]);

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99),
});

const customerOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Name is required").max(120),
  phoneNumber: z.string().trim().min(1, "Phone number is required").max(40),
  orderType: orderTypeSchema,
  scheduleType: z.enum(["now", "later"]),
  scheduledFor: z.string().trim().min(1),
  deliveryAddress: z.string().trim().max(500).optional(),
  deliveryLatitude: z.number().finite().optional(),
  deliveryLongitude: z.number().finite().optional(),
  items: z.array(orderItemSchema).min(1, "Please choose at least one item."),
});

export type CustomerOrderPayload = z.input<typeof customerOrderSchema>;

export type CreateCustomerOrderResult = {
  error?: string;
  orderNumber?: string;
};

function makeOrderNumber() {
  return `KP-${Date.now().toString(36).toUpperCase()}`;
}

export async function createCustomerOrder(
  payload: CustomerOrderPayload
): Promise<CreateCustomerOrderResult> {
  const parsed = customerOrderSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check your order.",
    };
  }

  const order = parsed.data;
  const scheduledFor =
    order.scheduleType === "now" ? new Date() : new Date(order.scheduledFor);

  if (Number.isNaN(scheduledFor.getTime())) {
    return { error: "Please choose a valid date and time." };
  }

  if (order.orderType === "deliver") {
    if (
      !order.deliveryAddress ||
      typeof order.deliveryLatitude !== "number" ||
      typeof order.deliveryLongitude !== "number"
    ) {
      return { error: "Please confirm your delivery location." };
    }
  }

  const items = order.items.map((item) => {
    const product = getMenuItem(item.productId);
    if (!product) return null;

    const lineTotal = product.price * item.quantity;
    return {
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      lineTotal,
    };
  });

  if (items.some((item) => item === null)) {
    return { error: "One of the selected products is no longer available." };
  }

  const validItems = items.filter((item): item is NonNullable<typeof item> =>
    Boolean(item)
  );
  const totalAmount = validItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const orderNumber = makeOrderNumber();

  await db.customerOrder.create({
    data: {
      orderNumber,
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      orderType: order.orderType,
      scheduledFor,
      deliveryAddress: order.deliveryAddress,
      deliveryLatitude: order.deliveryLatitude,
      deliveryLongitude: order.deliveryLongitude,
      totalAmount,
      items: {
        create: validItems,
      },
    },
  });

  return { orderNumber };
}
