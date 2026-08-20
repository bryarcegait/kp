"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageLoyalty } from "@/lib/loyalty-access";
import { LOYALTY_REWARDS } from "@/lib/loyalty";

const adjustSchema = z.object({
  customerId: z.string().min(1),
  points: z.coerce.number().int().min(-100).max(100).refine((value) => value !== 0, {
    message: "Adjustment cannot be zero",
  }),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});

const redeemSchema = z.object({
  customerId: z.string().min(1),
  rewardStamps: z.coerce.number().int(),
});

export type LoyaltyFormState = {
  error?: string;
  success?: string;
};

async function requireLoyaltyManager() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;
  if (!canManageLoyalty(session.user)) {
    return { error: "Only System Admin can manage loyalty cards." } as const;
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
    points: formData.get("points"),
    remarks: formData.get("remarks") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid adjustment." };
  }

  const { customerId, points, remarks } = parsed.data;
  const result = await db.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { error: "Customer not found." } as const;

    const nextBalance = customer.loyaltyPoints + points;
    if (nextBalance < 0) {
      return { error: "Customer does not have enough stamps for this adjustment." } as const;
    }

    const updated = await tx.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: nextBalance,
        ...(points > 0 ? { lifetimePoints: { increment: points } } : {}),
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        customerId,
        type: "adjustment",
        points,
        balanceAfter: updated.loyaltyPoints,
        remarks: remarks || "Manual loyalty adjustment.",
        createdById: guard.session.user.id,
      },
    });

    return { success: "Loyalty stamps adjusted." } as const;
  });

  revalidateLoyalty();
  return result;
}

export async function redeemLoyaltyReward(
  _prevState: LoyaltyFormState,
  formData: FormData
): Promise<LoyaltyFormState> {
  const guard = await requireLoyaltyManager();
  if ("error" in guard) return { error: guard.error };

  const parsed = redeemSchema.safeParse({
    customerId: formData.get("customerId"),
    rewardStamps: formData.get("rewardStamps"),
  });

  if (!parsed.success) {
    return { error: "Please choose a valid reward." };
  }

  const reward = LOYALTY_REWARDS.find(
    (item) => item.stamps === parsed.data.rewardStamps
  );
  if (!reward) return { error: "Reward not found." };

  const result = await db.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { id: parsed.data.customerId },
    });
    if (!customer) return { error: "Customer not found." } as const;
    if (customer.loyaltyPoints < reward.stamps) {
      return { error: "Customer does not have enough stamps for this reward." } as const;
    }

    const updated = await tx.customer.update({
      where: { id: customer.id },
      data: {
        loyaltyPoints: { decrement: reward.stamps },
        redeemedPoints: { increment: reward.stamps },
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type: "redeemed",
        points: -reward.stamps,
        balanceAfter: updated.loyaltyPoints,
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
