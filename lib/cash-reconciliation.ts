export type CashReconciliationInput = {
  startingAmount: number;
  cashSales: number;
  gcashSales: number;
  expenses: number;
  adjustments: number;
  cashOnHand: number;
};

export function calculateCashReconciliation(input: CashReconciliationInput) {
  const expectedCashOnHand =
    input.startingAmount + input.cashSales + input.adjustments - input.expenses;
  const netCashMovement = input.cashSales + input.adjustments - input.expenses;
  const variance = input.cashOnHand - expectedCashOnHand;

  return {
    ...input,
    expectedCashOnHand,
    netCashMovement,
    variance,
    status:
      Math.abs(variance) < 0.01 ? "balanced" : variance > 0 ? "over" : "short",
  } as const;
}
