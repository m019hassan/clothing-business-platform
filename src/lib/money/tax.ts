/** Pure VAT math shared by server pricing and the counter UI. */
export function computeTaxAmount(lineTotal: number, ratePercent: number, inclusive: boolean): number {
  if (ratePercent <= 0) {
    return 0;
  }

  return inclusive ? (lineTotal * ratePercent) / (100 + ratePercent) : (lineTotal * ratePercent) / 100;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
