import { db } from "@/lib/db";
import { formatDateOnly, parseInputDate, toDateOnly } from "@/lib/dates";

export type CashTransferCalculation = {
  businessDate: Date;
  previousCashOnHand: number;
  previousCashOnHandDate: string | null;
  todayStartingAmount: number;
  transferAmount: number;
};

export async function getCashTransferCalculation(
  inputDate: string
): Promise<CashTransferCalculation> {
  const selectedDate = parseInputDate(inputDate);
  const businessDate = toDateOnly(selectedDate);

  const [todaySummary, previousSummary] = await Promise.all([
    db.dailyCashSummary.findUnique({ where: { businessDate } }),
    db.dailyCashSummary.findFirst({
      where: { businessDate: { lt: businessDate } },
      orderBy: { businessDate: "desc" },
    }),
  ]);

  const previousCashOnHand = Number(previousSummary?.cashOnHand ?? 0);
  const todayStartingAmount = Number(todaySummary?.startingAmount ?? 0);

  return {
    businessDate,
    previousCashOnHand,
    previousCashOnHandDate: previousSummary
      ? formatDateOnly(previousSummary.businessDate)
      : null,
    todayStartingAmount,
    transferAmount: Math.max(0, previousCashOnHand - todayStartingAmount),
  };
}
