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

export type CustomerLoyaltyCard = {
  displayName: string;
  email: string;
  loyaltyCode: string;
  loyaltyPoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  nextRewardStamps: number | null;
  rewardTiers: { stamps: number; name: string }[];
  claimedRewardStamps: number[];
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

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
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
        loyaltyRewardClaims: { select: { rewardId: true } },
      },
    }),
    getLoyaltyRewards(),
  ]);

  const claimedRewardIds = new Set(customer.loyaltyRewardClaims.map((claim) => claim.rewardId));

  return {
    displayName: customer.displayName,
    email: customer.email,
    loyaltyCode: customer.loyaltyCode,
    loyaltyPoints: customer.loyaltyPoints,
    lifetimePoints: customer.lifetimePoints,
    redeemedPoints: customer.redeemedPoints,
    nextRewardStamps: getNextLoyaltyReward(customer.loyaltyPoints, rewardTiers)?.stamps ?? null,
    rewardTiers,
    claimedRewardStamps: rewardTiers
      .filter((reward) => claimedRewardIds.has(reward.id))
      .map((reward) => reward.stamps),
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

export async function logoutCustomer() {
  await clearCustomerSession();
}

/**
 * Finds or creates the Customer for an OAuth sign-in. If an account with a
 * matching (provider-verified) email already exists — e.g. they originally
 * signed up with a password — this links the provider id to it instead of
 * creating a duplicate.
 */
export async function findOrCreateOAuthCustomer({
  provider,
  providerId,
  email,
  displayName,
}: {
  provider: "google" | "facebook";
  providerId: string;
  email: string;
  displayName: string;
}) {
  const normalizedEmail = email.toLowerCase();
  const providerData =
    provider === "google" ? { googleId: providerId } : { facebookId: providerId };

  const existingByProvider = await db.customer.findUnique({ where: providerData });
  if (existingByProvider) return existingByProvider;

  const existingByEmail = await db.customer.findUnique({ where: { email: normalizedEmail } });
  if (existingByEmail) {
    return db.customer.update({
      where: { id: existingByEmail.id },
      data: { ...providerData, emailVerified: true },
    });
  }

  return db.customer.create({
    data: {
      displayName,
      email: normalizedEmail,
      loyaltyCode: generateLoyaltyCode(),
      emailVerified: true,
      ...providerData,
    },
  });
}
