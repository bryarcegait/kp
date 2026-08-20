export const LOYALTY_SPEND_PER_STAMP = 200;

export const LOYALTY_REWARDS = [
  { stamps: 5, name: "5-stamp free reward" },
  { stamps: 10, name: "10-stamp free reward" },
] as const;

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

export function calculateOrderStamps(eligibleSubtotal: number) {
  if (eligibleSubtotal <= 0) return 0;
  return Math.floor(eligibleSubtotal / LOYALTY_SPEND_PER_STAMP);
}

export function getNextLoyaltyReward(points: number) {
  return LOYALTY_REWARDS.find((reward) => points < reward.stamps) ?? null;
}

export function getRedeemableRewards(points: number) {
  return LOYALTY_REWARDS.filter((reward) => points >= reward.stamps);
}
