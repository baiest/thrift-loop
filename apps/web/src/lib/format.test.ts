import { describe, expect, it } from 'vitest';
import { formatCOP, formatRemaining } from './format.js';

describe('formatCOP', () => {
  it('formats a whole number of pesos with the currency symbol', () => {
    expect(formatCOP(50_000)).toMatch(/\$\s?50\.000/);
  });

  it('formats zero', () => {
    expect(formatCOP(0)).toMatch(/\$\s?0/);
  });
});

describe('formatRemaining', () => {
  it('formats minutes and seconds', () => {
    const twoMinutes = 2 * 60 * 1000;
    expect(formatRemaining(twoMinutes)).toBe('2m 00s');
  });

  it('formats less than a minute', () => {
    expect(formatRemaining(45 * 1000)).toBe('0m 45s');
  });

  it('clamps negative remaining time to Ended', () => {
    expect(formatRemaining(-1000)).toBe('Ended');
  });

  it('shows Ended at exactly zero', () => {
    expect(formatRemaining(0)).toBe('Ended');
  });
});
