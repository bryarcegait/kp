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
import {
  calculateOrderStamps,
  getNextLoyaltyReward,
  isValidLoyaltyPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/loyalty";

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
  loyalty?: {
    customerName: string;
    isNewCustomer: boolean;
    stampsEarned: number;
    currentStamps: number;
    nextRewardStamps: number | null;
  };
};

export type CustomerLookupResult = {
  error?: string;
  customer?: {
    name: string;
    phoneNumber: string;
    currentStamps: number;
    lifetimeStamps: number;
    redeemedStamps: number;
    lastOrderAt: string | null;
    nextRewardStamps: number | null;
  };
};

function makeOrderNumber() {
  return `KP-${Date.now().toString(36).toUpperCase()}`;
}

function formatPeso(amount: number) {
  return `₱${amount.toFixed(2)}`;
}

function isDeliveryFeeItem(name: string) {
  return name.trim().toLowerCase() === "delivery fee";
}

export async function lookupCustomerByPhone(
  phoneNumber: string
): Promise<CustomerLookupResult> {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  if (!isValidLoyaltyPhoneNumber(normalizedPhoneNumber)) {
    return { error: "Enter a valid cellphone number to check loyalty points." };
  }

  const customer = await db.customer.findUnique({
    where: { phoneNumber: normalizedPhoneNumber },
  });

  if (!customer) return {};

  return {
    customer: {
      name: customer.displayName,
      phoneNumber: customer.phoneNumber,
      currentStamps: customer.loyaltyPoints,
      lifetimeStamps: customer.lifetimePoints,
      redeemedStamps: customer.redeemedPoints,
      lastOrderAt: customer.lastOrderAt?.toISOString() ?? null,
      nextRewardStamps: getNextLoyaltyReward(customer.loyaltyPoints)?.stamps ?? null,
    },
  };
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
  const normalizedPhoneNumber = normalizePhoneNumber(order.phoneNumber);

  if (!isValidLoyaltyPhoneNumber(normalizedPhoneNumber)) {
    return { error: "Please enter a valid cellphone number." };
  }

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
  const loyaltyEligibleSubtotal = validItems
    .filter((item) => !isDeliveryFeeItem(item.productName))
    .reduce((sum, item) => sum + item.lineTotal, 0);
  const orderNumber = makeOrderNumber();
  const stampsEarned = calculateOrderStamps(loyaltyEligibleSubtotal);

  const result = await db.$transaction(async (tx) => {
    const existingCustomer = await tx.customer.findUnique({
      where: { phoneNumber: normalizedPhoneNumber },
    });
    const isNewCustomer = !existingCustomer;
    const customer = existingCustomer
      ? await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            displayName: order.customerName,
            lastOrderAt: scheduledFor,
          },
        })
      : await tx.customer.create({
          data: {
            phoneNumber: normalizedPhoneNumber,
            displayName: order.customerName,
            lastOrderAt: scheduledFor,
          },
        });

    const createdOrder = await tx.customerOrder.create({
      data: {
        orderNumber,
        customerId: customer.id,
        customerName: order.customerName,
        phoneNumber: normalizedPhoneNumber,
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

    const updatedCustomer =
      stampsEarned > 0
        ? await tx.customer.update({
            where: { id: customer.id },
            data: {
              loyaltyPoints: { increment: stampsEarned },
              lifetimePoints: { increment: stampsEarned },
            },
          })
        : customer;

    if (stampsEarned > 0) {
      await tx.loyaltyTransaction.create({
        data: {
          customerId: customer.id,
          orderId: createdOrder.id,
          type: "earned",
          points: stampsEarned,
          balanceAfter: updatedCustomer.loyaltyPoints,
          remarks: `${stampsEarned} stamp${stampsEarned === 1 ? "" : "s"} earned from ${formatPeso(loyaltyEligibleSubtotal)} eligible subtotal on order ${orderNumber}. Delivery fees are excluded.`,
        },
      });
    }

    return {
      isNewCustomer,
      customerName: updatedCustomer.displayName,
      currentStamps: updatedCustomer.loyaltyPoints,
    };
  });

  return {
    orderNumber,
    loyalty: {
      customerName: result.customerName,
      isNewCustomer: result.isNewCustomer,
      stampsEarned,
      currentStamps: result.currentStamps,
      nextRewardStamps: getNextLoyaltyReward(result.currentStamps)?.stamps ?? null,
    },
  };
}
