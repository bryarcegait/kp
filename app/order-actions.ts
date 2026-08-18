"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import {
  FRIES_FLAVOR_OPTIONS,
  WING_FLAVOR_OPTIONS,
  WING_SIDE_OPTIONS,
  getWingExtraFlavorCharge,
  getWingOrderChoiceByProductId,
} from "@/lib/customer-menu";

const orderTypeSchema = z.enum(["deliver", "pickup", "dine-in"]);
const paymentMethodSchema = z.enum(["cash", "gcash", "bank-transfer"]);

const customizationSchema = z
  .object({
    wingFlavors: z.array(z.enum(WING_FLAVOR_OPTIONS)).min(1).optional(),
    side: z.enum(WING_SIDE_OPTIONS).optional(),
    friesFlavor: z.enum(FRIES_FLAVOR_OPTIONS).optional(),
  })
  .optional();

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99),
  customization: customizationSchema,
});

const customerOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Name is required").max(120),
  phoneNumber: z.string().trim().min(1, "Phone number is required").max(40),
  orderType: orderTypeSchema,
  paymentMethod: paymentMethodSchema,
  customerNote: z.string().trim().max(1000).optional().or(z.literal("")),
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

function formatPeso(amount: number) {
  return `₱${amount.toFixed(2)}`;
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

  const productIds = order.items.map((item) => item.productId);
  const products = await db.menuProduct.findMany({
    where: { id: { in: productIds }, isAvailable: true },
  });
  const productsById = new Map(products.map((product) => [product.id, product]));

  const items = order.items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) return null;
    const wingChoice = getWingOrderChoiceByProductId(item.productId);

    if (wingChoice) {
      if (!item.customization?.wingFlavors?.length) return null;
      const hasSide =
        Boolean(wingChoice.withSideProductId) &&
        item.productId === wingChoice.withSideProductId;
      const side = item.customization.side ?? "No side";
      if (!wingChoice.supportsSides && side !== "No side") return null;
      if (hasSide && side === "No side") return null;
      if (!hasSide && side !== "No side") return null;
      if (side === "Fries" && !item.customization.friesFlavor) return null;
      if (side !== "Fries" && item.customization.friesFlavor) return null;
    }

    const extraFlavorCharge =
      wingChoice && item.customization?.wingFlavors
        ? getWingExtraFlavorCharge(wingChoice, item.customization.wingFlavors)
        : 0;
    const unitPrice = Number(product.price) + extraFlavorCharge;
    const lineTotal = unitPrice * item.quantity;
    const customizationParts =
      wingChoice && item.customization
        ? [
            item.customization.wingFlavors?.join(" / "),
            item.customization.side &&
            item.customization.side !== "No side" &&
            item.customization.side !== "Fries"
              ? item.customization.side
              : null,
            item.customization.friesFlavor
              ? `${item.customization.friesFlavor} Fries`
              : null,
            extraFlavorCharge > 0 ? `+${formatPeso(extraFlavorCharge)} extra flavors` : null,
          ].filter(Boolean)
        : [];

    return {
      productId: product.id,
      productName:
        customizationParts.length > 0
          ? `${wingChoice?.label ?? product.name} (${customizationParts.join(", ")})`
          : product.name,
      unitPrice,
      quantity: item.quantity,
      lineTotal,
    };
  });

  if (items.some((item) => item === null)) {
    return { error: "One of the selected products is no longer available or has invalid options." };
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
      paymentMethod: order.paymentMethod,
      customerNote: order.customerNote || null,
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
