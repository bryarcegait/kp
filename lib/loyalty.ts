import { db } from "@/lib/db";

export type LoyaltyRewardTier = {
  id: string;
  stamps: number;
  name: string;
};

export function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("63") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

export function isValidLoyaltyPhoneNumber(value: string) {
  const normalized = normalizePhoneNumber(value);
  return normalized.length >= 10 && normalized.length <= 13;
}

export async function getLoyaltyRewards(): Promise<LoyaltyRewardTier[]> {
  const rewards = await db.loyaltyReward.findMany({
    where: { isActive: true },
    orderBy: { stampsRequired: "asc" },
  });

  return rewards.map((reward) => ({
    id: reward.id,
    stamps: reward.stampsRequired,
    name: reward.rewardName,
  }));
}

export async function getLoyaltySpendPerStamp(): Promise<number> {
  const settings = await db.loyaltySettings.findUnique({ where: { id: "default" } });
  return Number(settings?.spendPerStamp ?? 200);
}

export function getNextLoyaltyReward(points: number, rewards: LoyaltyRewardTier[]) {
  return rewards.find((reward) => points < reward.stamps) ?? null;
}

export function getRedeemableRewards(
  points: number,
  rewards: LoyaltyRewardTier[],
  claimedRewardIds: Iterable<string> = []
) {
  const claimed = new Set(claimedRewardIds);
  return rewards.filter((reward) => points >= reward.stamps && !claimed.has(reward.id));
}

export function isFinalLoyaltyTier(reward: LoyaltyRewardTier, rewards: LoyaltyRewardTier[]) {
  return reward.stamps === Math.max(...rewards.map((item) => item.stamps));
}

/**
 * Converts a spend amount into stamps at `spendPerStamp` pesos each, carrying
 * any remainder forward so partial amounts accumulate across visits instead
 * of being lost (e.g. ₱250 at ₱200/stamp = 1 stamp + ₱50 carried over).
 */
export function applySpend(
  pendingAmount: number,
  spendAmount: number,
  spendPerStamp: number
): { stampsEarned: number; newPendingAmount: number } {
  const total = Math.round((pendingAmount + spendAmount) * 100) / 100;
  const stampsEarned = Math.floor(total / spendPerStamp);
  const newPendingAmount = Math.round((total - stampsEarned * spendPerStamp) * 100) / 100;

  return { stampsEarned, newPendingAmount };
}
