"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getNextLoyaltyReward,
  isValidLoyaltyPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/loyalty";

export type CustomerLoyaltyCard = {
  phoneNumber: string;
  displayName: string;
  email: string | null;
  address: string | null;
  birthday: string | null;
  loyaltyPoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  nextRewardStamps: number | null;
  latestTransactions: {
    id: string;
    type: string;
    points: number;
    balanceAfter: number;
    rewardName: string | null;
    remarks: string | null;
    createdAt: string;
  }[];
};

export type CustomerLoyaltyResult = {
  error?: string;
  card?: CustomerLoyaltyCard;
};

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters.")
  .max(100, "Password is too long.");

const loginSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required."),
  password: passwordSchema,
});

const signupSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required."),
  displayName: z.string().trim().min(2, "Name is required.").max(120),
  address: z.string().trim().max(500).optional(),
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid birthday.")
    .optional()
    .or(z.literal("")),
  password: passwordSchema,
});

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function birthdayToDate(value?: string) {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function birthdayToString(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

async function getCustomerCard(customerId: string): Promise<CustomerLoyaltyCard> {
  const customer = await db.customer.findUniqueOrThrow({
    where: { id: customerId },
    include: {
      loyaltyTransactions: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });

  return {
    phoneNumber: customer.phoneNumber,
    displayName: customer.displayName,
    email: customer.email,
    address: customer.address,
    birthday: birthdayToString(customer.birthday),
    loyaltyPoints: customer.loyaltyPoints,
    lifetimePoints: customer.lifetimePoints,
    redeemedPoints: customer.redeemedPoints,
    nextRewardStamps:
      getNextLoyaltyReward(customer.loyaltyPoints)?.stamps ?? null,
    latestTransactions: customer.loyaltyTransactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      points: transaction.points,
      balanceAfter: transaction.balanceAfter,
      rewardName: transaction.rewardName,
      remarks: transaction.remarks,
      createdAt: transaction.createdAt.toISOString(),
    })),
  };
}

export async function loginCustomerLoyalty(
  formData: FormData
): Promise<CustomerLoyaltyResult> {
  const parsed = loginSchema.safeParse({
    phoneNumber: stringValue(formData, "phoneNumber"),
    password: stringValue(formData, "password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const phoneNumber = normalizePhoneNumber(parsed.data.phoneNumber);
  if (!isValidLoyaltyPhoneNumber(phoneNumber)) {
    return { error: "Enter a valid cellphone number." };
  }

  const customer = await db.customer.findUnique({ where: { phoneNumber } });
  if (!customer?.passwordHash) {
    return { error: "No eLoyalty account found for this number. Please sign up." };
  }

  const isPasswordValid = await bcrypt.compare(
    parsed.data.password,
    customer.passwordHash
  );
  if (!isPasswordValid) return { error: "Incorrect phone number or password." };

  return { card: await getCustomerCard(customer.id) };
}

export async function signupCustomerLoyalty(
  formData: FormData
): Promise<CustomerLoyaltyResult> {
  const parsed = signupSchema.safeParse({
    phoneNumber: stringValue(formData, "phoneNumber"),
    displayName: stringValue(formData, "displayName"),
    address: stringValue(formData, "address"),
    email: stringValue(formData, "email"),
    birthday: stringValue(formData, "birthday"),
    password: stringValue(formData, "password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const phoneNumber = normalizePhoneNumber(parsed.data.phoneNumber);
  if (!isValidLoyaltyPhoneNumber(phoneNumber)) {
    return { error: "Enter a valid cellphone number." };
  }

  const existing = await db.customer.findUnique({ where: { phoneNumber } });
  if (existing?.passwordHash) {
    return { error: "This number already has an eLoyalty account. Please log in." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const data = {
    displayName: parsed.data.displayName,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    birthday: birthdayToDate(parsed.data.birthday),
    passwordHash,
  };

  const customer = existing
    ? await db.customer.update({
        where: { id: existing.id },
        data,
      })
    : await db.customer.create({
        data: {
          phoneNumber,
          ...data,
        },
      });

  return { card: await getCustomerCard(customer.id) };
}
