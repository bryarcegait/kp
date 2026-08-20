import { db } from "@/lib/db";
import { formatInputDate, parseInputDate, toDateOnly } from "@/lib/dates";

const LOYVERSE_BASE_URL = "https://api.loyverse.com/v1.0";

const CARD_PAYMENT_TYPES = new Set([
  "NONINTEGRATEDCARD",
  "WORLDPAY",
  "COINEY",
  "IZETTLE",
  "SUMUP",
  "TYRO",
  "CHECURITY",
  "SMARTPAY",
  "YOCO",
  "NICEPAY",
  "PAYGATE",
  "EZETAP",
  "FIRSTDATA",
  "SOFTBANK",
  "ONEPAY",
  "KICC",
  "MERCADOPAGO",
]);

type LoyversePaymentType = {
  id: string;
  name: string;
  type: string;
};

type LoyversePayment = {
  payment_type_id?: string;
  name?: string;
  type?: string;
  money_amount?: number;
  amount?: number;
  total_money?: number;
};

type LoyverseLineItem = {
  item_name?: string;
  total_money?: number;
  gross_total_money?: number;
};

type LoyverseItemVariant = {
  variant_id?: string;
  id?: string;
  default_price?: number;
  price?: number;
  option1_value?: string;
  option2_value?: string;
  option3_value?: string;
  deleted_at?: string | null;
};

type LoyverseItem = {
  id: string;
  item_name: string;
  image_url?: string | null;
  deleted_at?: string | null;
  variants?: LoyverseItemVariant[];
};

type LoyverseReceipt = {
  receipt_number: string;
  receipt_type: "SALE" | "REFUND";
  created_at: string;
  receipt_date?: string;
  cancelled_at?: string | null;
  total_money: number;
  line_items?: LoyverseLineItem[];
  payments?: LoyversePayment[];
};

type PaginatedResponse<TItem, TKey extends string> = Record<TKey, TItem[]> & {
  cursor?: string;
};

export type LoyversePaymentSummary = {
  type: "cash" | "card" | "other";
  label: string;
  total: number;
  count: number;
};

export type LoyverseTodayReport = {
  date: string;
  start: string;
  end: string;
  cashTotal: number;
  cardTotal: number;
  otherTotal: number;
  grossSales: number;
  deliveryFeeTotal: number;
  netSales: number;
  receiptCount: number;
  paymentCount: number;
  payments: LoyversePaymentSummary[];
};

export type LoyverseCatalogProduct = {
  id: string;
  itemId: string;
  name: string;
  price: number;
  imageUrl?: string;
};

export class LoyverseConfigError extends Error {
  constructor() {
    super("LOYVERSE_ACCESS_TOKEN is not configured.");
  }
}

function getDateRange(inputDate: string) {
  const [year, month, day] = inputDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

async function loyverseFetch<T>(path: string, params?: URLSearchParams) {
  const token = process.env.LOYVERSE_ACCESS_TOKEN;
  if (!token) throw new LoyverseConfigError();

  const url = new URL(`${LOYVERSE_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of params) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Loyverse API request failed (${response.status}): ${details}`);
  }

  return (await response.json()) as T;
}

async function loyverseRequest<T>(
  path: string,
  init: Omit<RequestInit, "headers"> & { body?: string }
) {
  const token = process.env.LOYVERSE_ACCESS_TOKEN;
  if (!token) throw new LoyverseConfigError();

  const response = await fetch(`${LOYVERSE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Loyverse API request failed (${response.status}): ${details}`);
  }

  return (await response.json()) as T;
}

async function fetchAll<TItem, TKey extends string>(
  path: string,
  collectionKey: TKey,
  params: URLSearchParams
) {
  const items: TItem[] = [];
  let cursor: string | undefined;

  do {
    const pageParams = new URLSearchParams(params);
    pageParams.set("limit", "250");
    if (cursor) pageParams.set("cursor", cursor);

    const page = await loyverseFetch<PaginatedResponse<TItem, TKey>>(
      path,
      pageParams
    );
    items.push(...(page[collectionKey] ?? []));
    cursor = page.cursor;
  } while (cursor);

  return items;
}

function getPaymentAmount(payment: LoyversePayment, receipt: LoyverseReceipt) {
  const directAmount =
    payment.money_amount ?? payment.amount ?? payment.total_money ?? null;

  if (typeof directAmount === "number") {
    return directAmount;
  }

  return receipt.payments?.length === 1 ? receipt.total_money : 0;
}

function getPaymentKind(paymentType?: LoyversePaymentType, payment?: LoyversePayment) {
  const type = paymentType?.type ?? payment?.type;
  if (type === "CASH") return "cash";
  if (type && CARD_PAYMENT_TYPES.has(type)) return "card";
  return "other";
}

function isDeliveryFeeLineItem(item: LoyverseLineItem) {
  return item.item_name?.trim().toLowerCase() === "delivery fee";
}

function getLineItemAmount(item: LoyverseLineItem) {
  return item.total_money ?? item.gross_total_money ?? 0;
}

export async function getLoyverseCatalogProducts() {
  const items = await fetchAll<LoyverseItem, "items">(
    "/items",
    "items",
    new URLSearchParams()
  );

  return items.flatMap<LoyverseCatalogProduct>((item) => {
    if (item.deleted_at) return [];

    const variants = item.variants?.filter((variant) => !variant.deleted_at) ?? [];
    if (variants.length === 0) {
      return [
        {
          id: item.id,
          itemId: item.id,
          name: item.item_name,
          price: 0,
          imageUrl: item.image_url ?? undefined,
        },
      ];
    }

    return variants.map((variant) => {
      const optionName = [
        variant.option1_value,
        variant.option2_value,
        variant.option3_value,
      ]
        .filter(Boolean)
        .join(" / ");

      return {
        id: variant.variant_id ?? variant.id ?? item.id,
        itemId: item.id,
        name: optionName ? `${item.item_name} (${optionName})` : item.item_name,
        price: variant.default_price ?? variant.price ?? 0,
        imageUrl: item.image_url ?? undefined,
      };
    });
  });
}

export async function getLoyverseTodayReport(date: Date | string = new Date()) {
  const selectedDate =
    typeof date === "string" ? parseInputDate(date) : formatInputDate(date);
  const { start, end } = getDateRange(selectedDate);

  const [paymentTypes, receipts] = await Promise.all([
    fetchAll<LoyversePaymentType, "payment_types">(
      "/payment_types",
      "payment_types",
      new URLSearchParams()
    ),
    fetchAll<LoyverseReceipt, "receipts">(
      "/receipts",
      "receipts",
      new URLSearchParams({
        created_at_min: start.toISOString(),
        created_at_max: end.toISOString(),
      })
    ),
  ]);

  const paymentTypesById = new Map(paymentTypes.map((type) => [type.id, type]));
  const summaries = new Map<string, LoyversePaymentSummary>();
  let receiptCount = 0;
  let paymentCount = 0;
  let grossSales = 0;
  let deliveryFeeTotal = 0;

  for (const receipt of receipts) {
    if (receipt.cancelled_at) continue;
    receiptCount += 1;
    const factor = receipt.receipt_type === "REFUND" ? -1 : 1;
    const deliveryFee =
      receipt.line_items
        ?.filter(isDeliveryFeeLineItem)
        .reduce((sum, item) => sum + getLineItemAmount(item), 0) ?? 0;

    grossSales += receipt.total_money * factor;
    deliveryFeeTotal += deliveryFee * factor;

    for (const payment of receipt.payments ?? []) {
      paymentCount += 1;
      const paymentType = payment.payment_type_id
        ? paymentTypesById.get(payment.payment_type_id)
        : undefined;
      const kind = getPaymentKind(paymentType, payment);
      const label = paymentType?.name ?? payment.name ?? "Other";
      const key = `${kind}:${label}`;
      const amount = getPaymentAmount(payment, receipt) * factor;
      const current =
        summaries.get(key) ??
        ({
          type: kind,
          label,
          total: 0,
          count: 0,
        } satisfies LoyversePaymentSummary);

      current.total += amount;
      current.count += 1;
      summaries.set(key, current);
    }
  }

  const payments = Array.from(summaries.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.label.localeCompare(b.label);
  });

  return {
    date: selectedDate,
    start: start.toISOString(),
    end: end.toISOString(),
    cashTotal: payments
      .filter((payment) => payment.type === "cash")
      .reduce((sum, payment) => sum + payment.total, 0),
    cardTotal: payments
      .filter((payment) => payment.type === "card")
      .reduce((sum, payment) => sum + payment.total, 0),
    otherTotal: payments
      .filter((payment) => payment.type === "other")
      .reduce((sum, payment) => sum + payment.total, 0),
    grossSales,
    deliveryFeeTotal,
    netSales: grossSales - deliveryFeeTotal,
    receiptCount,
    paymentCount,
    payments,
  } satisfies LoyverseTodayReport;
}

export async function saveLoyverseDailyReport(date: Date | string = new Date()) {
  const report = await getLoyverseTodayReport(date);
  const businessDate = toDateOnly(report.date);

  return db.dailyPosReport.upsert({
    where: { businessDate },
    update: {
      grossSales: report.grossSales,
      deliveryFeeTotal: report.deliveryFeeTotal,
      netSales: report.netSales,
      cashTotal: report.cashTotal,
      cardTotal: report.cardTotal,
      otherTotal: report.otherTotal,
      receiptCount: report.receiptCount,
      paymentCount: report.paymentCount,
      paymentBreakdown: report.payments,
      fetchedAt: new Date(),
    },
    create: {
      businessDate,
      grossSales: report.grossSales,
      deliveryFeeTotal: report.deliveryFeeTotal,
      netSales: report.netSales,
      cashTotal: report.cashTotal,
      cardTotal: report.cardTotal,
      otherTotal: report.otherTotal,
      receiptCount: report.receiptCount,
      paymentCount: report.paymentCount,
      paymentBreakdown: report.payments,
      fetchedAt: new Date(),
    },
  });
}

type LoyverseReceiptCreateResponse = {
  receipt_number: string;
};

type LoyverseOrderPaymentMethod = "cash" | "gcash" | "bank-transfer";

type LoyverseOrderPayload = {
  orderNumber: string;
  customerName: string;
  phoneNumber: string;
  paymentMethod: LoyverseOrderPaymentMethod;
  scheduledFor: Date;
  orderType: string;
  customerNote?: string | null;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function getPaymentTypeId(paymentMethod: LoyverseOrderPaymentMethod) {
  if (paymentMethod === "cash") {
    return getRequiredEnv("LOYVERSE_CASH_PAYMENT_TYPE_ID");
  }
  if (paymentMethod === "gcash") {
    return getRequiredEnv("LOYVERSE_GCASH_PAYMENT_TYPE_ID");
  }
  return getRequiredEnv("LOYVERSE_BANK_TRANSFER_PAYMENT_TYPE_ID");
}

export async function createLoyverseReceiptForOrder(order: LoyverseOrderPayload) {
  const storeId = getRequiredEnv("LOYVERSE_STORE_ID");
  const employeeId = process.env.LOYVERSE_EMPLOYEE_ID;
  const paymentTypeId = getPaymentTypeId(order.paymentMethod);
  const noteParts = [
    `KP online order ${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.phoneNumber}`,
    `Order type: ${order.orderType}`,
    order.customerNote ? `Note: ${order.customerNote}` : null,
  ].filter(Boolean);

  const receipt = await loyverseRequest<LoyverseReceiptCreateResponse>(
    "/receipts",
    {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        ...(employeeId ? { employee_id: employeeId } : {}),
        order: order.orderNumber,
        source: "Kanto't Pakpakan Online Ordering",
        receipt_date: order.scheduledFor.toISOString(),
        note: noteParts.join("\n"),
        line_items: order.items.map((item) => ({
          variant_id: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
          line_note: item.productName,
        })),
        payments: [
          {
            payment_type_id: paymentTypeId,
            paid_at: new Date().toISOString(),
          },
        ],
      }),
    }
  );

  return receipt.receipt_number;
}
