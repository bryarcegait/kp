"use server";

import crypto from "crypto";
import { db } from "@/lib/db";
import { getLoyaltyRewards, getNextLoyaltyReward } from "@/lib/loyalty";
import { clearCustomerSession, getCustomerSession } from "@/lib/customer-auth";

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
