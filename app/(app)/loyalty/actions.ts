"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageLoyalty, canAwardLoyalty } from "@/lib/loyalty-access";
import {
  getLoyaltyRewards,
  getLoyaltySpendPerStamp,
  getNextLoyaltyReward,
  getRedeemableRewards,
  isFinalLoyaltyTier,
  applySpend,
} from "@/lib/loyalty";

const adjustSchema = z.object({
  customerId: z.string().min(1),
  amount: z.coerce.number().min(-200000).max(200000).refine((value) => value !== 0, {
    message: "Adjustment amount cannot be zero",
  }),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});

const redeemSchema = z.object({
  customerId: z.string().min(1),
  rewardStamps: z.coerce.number().int(),
});

const awardSchema = z.object({
  loyaltyCode: z.string().min(1, "Scan or upload a loyalty QR code first."),
  amount: z.coerce.number().positive("Enter the order amount."),
  source: z.enum(["in_store", "online"]),
});

const rewardSchema = z.object({
  stampsRequired: z.coerce.number().int().min(1).max(1000),
  rewardName: z.string().trim().min(1, "Reward name is required.").max(200),
});

const settingsSchema = z.object({
  spendPerStamp: z.coerce.number().positive("Must be greater than zero."),
});

export type LoyaltyFormState = {
  error?: string;
  success?: string;
};

export type AwardLoyaltyState = {
  error?: string;
  success?: string;
  customerName?: string;
  stampsEarned?: number;
  message?: string;
};

async function requireLoyaltyManager() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;
  if (!canManageLoyalty(session.user)) {
    return { error: "Only System Admin can manage loyalty cards." } as const;
  }
  return { session } as const;
}

async function requireLoyaltyAwarder() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;
  if (!canAwardLoyalty(session.user)) {
    return { error: "You don't have permission to award stamps." } as const;
  }
  return { session } as const;
}

function revalidateLoyalty() {
  revalidatePath("/loyalty");
}

export async function adjustLoyaltyPoints(
  _prevState: LoyaltyFormState,
  formData: FormData
): Promise<LoyaltyFormState> {
  const guard = await requireLoyaltyManager();
  if ("error" in guard) return { error: guard.error };

  const parsed = adjustSchema.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    remarks: formData.get("remarks") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid adjustment." };
  }

  const { customerId, amount, remarks } = parsed.data;
  const spendPerStamp = await getLoyaltySpendPerStamp();
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { error: "Customer not found." } as const;

    const currentCredit =
      customer.loyaltyPoints * spendPerStamp + Number(customer.pendingStampAmount);
    const nextCredit = Math.round((currentCredit + amount) * 100) / 100;
    if (nextCredit < 0) {
      return { error: "Adjustment amount is greater than the customer's loyalty balance." } as const;
    }

    const nextBalance = Math.floor(nextCredit / spendPerStamp);
    const nextPendingAmount =
      Math.round((nextCredit - nextBalance * spendPerStamp) * 100) / 100;
    const pointDelta = nextBalance - customer.loyaltyPoints;

    const updated = await tx.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: nextBalance,
        pendingStampAmount: nextPendingAmount,
        ...(pointDelta > 0 ? { lifetimePoints: { increment: pointDelta } } : {}),
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        customerId,
        type: "adjustment",
        points: pointDelta,
        balanceAfter: updated.loyaltyPoints,
        remarks:
          remarks ||
          `Manual amount adjustment of ₱${amount.toFixed(2)} (${pointDelta >= 0 ? "+" : ""}${pointDelta} stamp${Math.abs(pointDelta) === 1 ? "" : "s"}).`,
        createdById: guard.session.user.id,
      },
    });

    return { success: "Loyalty amount adjusted." } as const;
  });

  revalidateLoyalty();
  return result;
}
export async function redeemLoyaltyReward(
  _prevState: LoyaltyFormState,
  formData: FormData
): Promise<LoyaltyFormState> {
  // Broader than manage-only: front-line staff need to process a
  // customer's earned reward at checkout, not just System Admin/Manager.
  const guard = await requireLoyaltyAwarder();
  if ("error" in guard) return { error: guard.error };

  const parsed = redeemSchema.safeParse({
    customerId: formData.get("customerId"),
    rewardStamps: formData.get("rewardStamps"),
  });

  if (!parsed.success) {
    return { error: "Please choose a valid reward." };
  }

  const rewards = await getLoyaltyRewards();
  const reward = rewards.find((item) => item.stamps === parsed.data.rewardStamps);
  if (!reward) return { error: "Reward not found." };
  const isFinalTier = isFinalLoyaltyTier(reward, rewards);

  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM customers WHERE id = ${parsed.data.customerId} FOR UPDATE`;
    const customer = await tx.customer.findUnique({
      where: { id: parsed.data.customerId },
    });
    if (!customer) return { error: "Customer not found." } as const;
    if (customer.loyaltyPoints < reward.stamps) {
      return { error: "Customer does not have enough stamps for this reward." } as const;
    }

    const alreadyClaimed = await tx.loyaltyRewardClaim.findUnique({
      where: { customerId_rewardId: { customerId: customer.id, rewardId: reward.id } },
    });
    if (alreadyClaimed) {
      return { error: "This reward was already claimed." } as const;
    }

    // Only the final (highest) tier resets the card — claiming an earlier
    // tier just marks it claimed so the customer keeps progressing toward
    // the next one instead of losing their stamps.
    let balanceAfter = customer.loyaltyPoints;
    if (isFinalTier) {
      balanceAfter = 0;
      await tx.customer.update({
        where: { id: customer.id },
        data: { loyaltyPoints: 0, redeemedPoints: { increment: reward.stamps } },
      });
      await tx.loyaltyRewardClaim.deleteMany({ where: { customerId: customer.id } });
    } else {
      await tx.customer.update({
        where: { id: customer.id },
        data: { redeemedPoints: { increment: reward.stamps } },
      });
      await tx.loyaltyRewardClaim.create({
        data: { customerId: customer.id, rewardId: reward.id },
      });
    }

    await tx.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type: "redeemed",
        points: isFinalTier ? -customer.loyaltyPoints : 0,
        balanceAfter,
        rewardName: reward.name,
        remarks: reward.name,
        createdById: guard.session.user.id,
      },
    });

    return { success: `${reward.name} redeemed.` } as const;
  });

  revalidateLoyalty();
  return result;
}

const REPLAY_GUARD_WINDOW_MS = 5000;

export async function awardLoyaltyStamps(
  _prevState: AwardLoyaltyState,
  formData: FormData
): Promise<AwardLoyaltyState> {
  const guard = await requireLoyaltyAwarder();
  if ("error" in guard) return { error: guard.error };

  const parsed = awardSchema.safeParse({
    loyaltyCode: formData.get("loyaltyCode"),
    amount: formData.get("amount"),
    source: formData.get("source"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid award." };
  }

  const spendPerStamp = await getLoyaltySpendPerStamp();
  const rewards = await getLoyaltyRewards();

  const result = await db.$transaction(async (tx) => {
    // Lock and read the row in the same statement: a locking read always
    // sees the latest committed data, so this can't observe a stale
    // pendingStampAmount left over from a concurrent award that's still
    // running (a plain findUnique before the lock could).
    const rows = await tx.$queryRaw<
      { id: string; displayName: string; pendingStampAmount: string; loyaltyPoints: number }[]
    >`SELECT id, displayName, pendingStampAmount, loyaltyPoints FROM customers WHERE loyaltyCode = ${parsed.data.loyaltyCode} FOR UPDATE`;
    const customer = rows[0];
    if (!customer) return { error: "No account found for that QR code." } as const;

    const lastTransaction = await tx.loyaltyTransaction.findFirst({
      where: { customerId: customer.id, type: "earned" },
      orderBy: { createdAt: "desc" },
    });
    if (
      lastTransaction &&
      Date.now() - lastTransaction.createdAt.getTime() < REPLAY_GUARD_WINDOW_MS
    ) {
      return {
        error: "Stamps were just awarded to this customer — please wait a few seconds before scanning again.",
      } as const;
    }

    const { stampsEarned, newPendingAmount } = applySpend(
      Number(customer.pendingStampAmount),
      parsed.data.amount,
      spendPerStamp
    );

    const updated = await tx.customer.update({
      where: { id: customer.id },
      data: {
        pendingStampAmount: newPendingAmount,
        ...(stampsEarned > 0
          ? { loyaltyPoints: { increment: stampsEarned }, lifetimePoints: { increment: stampsEarned } }
          : {}),
        lastOrderAt: new Date(),
      },
    });

    if (stampsEarned > 0) {
      await tx.loyaltyTransaction.create({
        data: {
          customerId: customer.id,
          type: "earned",
          points: stampsEarned,
          balanceAfter: updated.loyaltyPoints,
          remarks: `${parsed.data.source === "in_store" ? "In-store" : "Online order"} spend of ₱${parsed.data.amount.toFixed(2)}`,
          createdById: guard.session.user.id,
        },
      });
    }

    const nextReward = getNextLoyaltyReward(updated.loyaltyPoints, rewards);
    const message =
      stampsEarned > 0
        ? `You earned ${stampsEarned} stamp${stampsEarned === 1 ? "" : "s"}! ${
            nextReward
              ? `${nextReward.stamps - updated.loyaltyPoints} more to get ${nextReward.name}.`
              : rewards.length > 0
                ? "You have a reward ready to redeem!"
                : "No reward tiers are configured yet — set one up in Program Settings."
          }`
        : `₱${parsed.data.amount.toFixed(2)} recorded. ₱${(spendPerStamp - newPendingAmount).toFixed(2)} more to earn a stamp.`;

    return {
      success: "Stamps awarded.",
      customerName: customer.displayName,
      stampsEarned,
      message,
    } as const;
  });

  revalidateLoyalty();
  return result;
}

export async function findCustomerByLoyaltyCode(loyaltyCode: string) {
  const guard = await requireLoyaltyAwarder();
  if ("error" in guard) return { error: guard.error } as const;

  const [customer, rewards] = await Promise.all([
    db.customer.findUnique({
      where: { loyaltyCode },
      select: {
        id: true,
        displayName: true,
        loyaltyPoints: true,
        loyaltyRewardClaims: { select: { rewardId: true } },
      },
    }),
    getLoyaltyRewards(),
  ]);
  if (!customer) return { error: "No account found for that QR code." } as const;

  const redeemableRewards = getRedeemableRewards(
    customer.loyaltyPoints,
    rewards,
    customer.loyaltyRewardClaims.map((claim) => claim.rewardId)
  );

  return {
    customer: {
      id: customer.id,
      displayName: customer.displayName,
      loyaltyPoints: customer.loyaltyPoints,
      redeemableRewards,
    },
  } as const;
}

export async function upsertLoyaltyReward(
  _prevState: LoyaltyFormState,
  formData: FormData
): Promise<LoyaltyFormState> {
  const guard = await requireLoyaltyManager();
  if ("error" in guard) return { error: guard.error };

  const parsed = rewardSchema.safeParse({
    stampsRequired: formData.get("stampsRequired"),
    rewardName: formData.get("rewardName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid reward." };
  }

  await db.loyaltyReward.upsert({
    where: { stampsRequired: parsed.data.stampsRequired },
    update: { rewardName: parsed.data.rewardName, isActive: true },
    create: {
      stampsRequired: parsed.data.stampsRequired,
      rewardName: parsed.data.rewardName,
      sortOrder: parsed.data.stampsRequired,
    },
  });

  revalidateLoyalty();
  return { success: "Reward tier saved." };
}

export async function deactivateLoyaltyReward(
  _prevState: LoyaltyFormState,
  formData: FormData
): Promise<LoyaltyFormState> {
  const guard = await requireLoyaltyManager();
  if ("error" in guard) return { error: guard.error };

  const stampsRequired = Number(formData.get("stampsRequired"));
  if (!stampsRequired) return { error: "Reward not found." };

  await db.loyaltyReward.update({
    where: { stampsRequired },
    data: { isActive: false },
  });

  revalidateLoyalty();
  return { success: "Reward tier removed." };
}

export async function updateLoyaltySettings(
  _prevState: LoyaltyFormState,
  formData: FormData
): Promise<LoyaltyFormState> {
  const guard = await requireLoyaltyManager();
  if ("error" in guard) return { error: guard.error };

  const parsed = settingsSchema.safeParse({ spendPerStamp: formData.get("spendPerStamp") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid setting." };
  }

  await db.loyaltySettings.upsert({
    where: { id: "default" },
    update: { spendPerStamp: parsed.data.spendPerStamp },
    create: { id: "default", spendPerStamp: parsed.data.spendPerStamp },
  });

  revalidateLoyalty();
  return { success: "Earning rule updated." };
}
