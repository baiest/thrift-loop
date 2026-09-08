import { describe, expect, it } from 'vitest';
import { MAX_PRICE_COP, MIN_PRICE_COP, isValidCopPrice } from './price.js';

describe('isValidCopPrice', () => {
  it('accepts a typical price', () => {
    expect(isValidCopPrice(50_000)).toBe(true);
  });

  it('accepts the minimum price', () => {
    expect(isValidCopPrice(MIN_PRICE_COP)).toBe(true);
  });

  it('accepts the maximum price', () => {
    expect(isValidCopPrice(MAX_PRICE_COP)).toBe(true);
  });

  it('rejects zero', () => {
    expect(isValidCopPrice(0)).toBe(false);
  });

  it('rejects a negative price', () => {
    expect(isValidCopPrice(-1000)).toBe(false);
  });

  it('rejects a price below the minimum', () => {
    expect(isValidCopPrice(MIN_PRICE_COP - 1)).toBe(false);
  });

  it('rejects a price above the maximum', () => {
    expect(isValidCopPrice(MAX_PRICE_COP + 1)).toBe(false);
  });

  it('rejects a non-integer price', () => {
    expect(isValidCopPrice(50_000.5)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(isValidCopPrice(Number.NaN)).toBe(false);
  });
});
