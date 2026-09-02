"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getLoyaltyRewards, getNextLoyaltyReward } from "@/lib/loyalty";
import {
  createCustomerSession,
  clearCustomerSession,
  getCustomerSession,
  checkLoginRateLimit,
} from "@/lib/customer-auth";
import { sendVerificationEmail } from "@/lib/mailer";

export type CustomerLoyaltyCard = {
  displayName: string;
  email: string;
  loyaltyCode: string;
  loyaltyPoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  nextRewardStamps: number | null;
  rewardTiers: { stamps: number; name: string }[];
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
  message?: string;
  card?: CustomerLoyaltyCard;
};

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters.")
  .max(100, "Password is too long.");

// Used to keep login timing/response identical whether or not the email is
// registered, so failed attempts can't be used to enumerate accounts.
const DUMMY_PASSWORD_HASH = "$2b$10$qfqR9Ek4JuMzfETP5e4BGuN1PPIXeAxrMgCNDna5pR8tyx7Y7quKC";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: passwordSchema,
});

const signupSchema = z
  .object({
    nickname: z.string().trim().min(2, "Nickname is required.").max(120),
    email: z.string().trim().email("Enter a valid email."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateLoyaltyCode() {
  return crypto.randomBytes(9).toString("base64url");
}

async function getCustomerCard(customerId: string): Promise<CustomerLoyaltyCard> {
  const [customer, rewardTiers] = await Promise.all([
    db.customer.findUniqueOrThrow({
      where: { id: customerId },
      include: {
        loyaltyTransactions: {
          orderBy: { createdAt: "desc" },
          take: 6,
        },
      },
    }),
    getLoyaltyRewards(),
  ]);

  return {
    displayName: customer.displayName,
    email: customer.email,
    loyaltyCode: customer.loyaltyCode,
    loyaltyPoints: customer.loyaltyPoints,
    lifetimePoints: customer.lifetimePoints,
    redeemedPoints: customer.redeemedPoints,
    nextRewardStamps: getNextLoyaltyReward(customer.loyaltyPoints, rewardTiers)?.stamps ?? null,
    rewardTiers,
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

export async function getCurrentCustomerCard(): Promise<CustomerLoyaltyCard | null> {
  const session = await getCustomerSession();
  if (!session) return null;

  try {
    return await getCustomerCard(session.customerId);
  } catch {
    return null;
  }
}

export async function loginCustomerLoyalty(
  formData: FormData
): Promise<CustomerLoyaltyResult> {
  const parsed = loginSchema.safeParse({
    email: stringValue(formData, "email"),
    password: stringValue(formData, "password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const email = parsed.data.email.toLowerCase();

  if (!checkLoginRateLimit(email)) {
    return { error: "Too many login attempts. Please wait a few minutes and try again." };
  }

  const customer = await db.customer.findUnique({ where: { email } });
  // Compare against a dummy hash when there's no account so the response
  // doesn't reveal via timing or message text whether this email is
  // registered — both cases return the exact same error.
  const isPasswordValid = await bcrypt.compare(
    parsed.data.password,
    customer?.passwordHash ?? DUMMY_PASSWORD_HASH
  );
  if (!customer || !isPasswordValid) {
    return { error: "Incorrect email or password." };
  }

  if (!customer.emailVerified) {
    return { error: "Please verify your email before logging in. Check your inbox." };
  }

  await createCustomerSession(customer.id);

  return { card: await getCustomerCard(customer.id) };
}

export async function signupCustomerLoyalty(
  formData: FormData
): Promise<CustomerLoyaltyResult> {
  const parsed = signupSchema.safeParse({
    nickname: stringValue(formData, "nickname"),
    email: stringValue(formData, "email"),
    password: stringValue(formData, "password"),
    confirmPassword: stringValue(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.customer.findUnique({ where: { email } });
  if (existing) {
    return { error: "This email already has an eLoyalty account. Please log in." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.customer.create({
    data: {
      displayName: parsed.data.nickname,
      email,
      passwordHash,
      loyaltyCode: generateLoyaltyCode(),
      emailVerified: false,
      verificationTokenHash: hashToken(verificationToken),
      verificationTokenExpiresAt,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const verifyUrl = `${baseUrl}/api/customer/verify-email?token=${verificationToken}`;
  await sendVerificationEmail(email, verifyUrl);

  return {
    message: "Account created! Check your email for a verification link before logging in.",
  };
}

export async function logoutCustomer() {
  await clearCustomerSession();
}
