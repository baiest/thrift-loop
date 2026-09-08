export const MIN_PRICE_COP = 1000;
export const MAX_PRICE_COP = 1_000_000_000;

export function isValidCopPrice(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_PRICE_COP && value <= MAX_PRICE_COP;
}
