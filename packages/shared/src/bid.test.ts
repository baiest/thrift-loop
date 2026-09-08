import { describe, expect, it } from 'vitest';
import { MAX_PRICE_COP } from './price.js';
import { BID_WINDOW_MS, MIN_BID_INCREMENT_COP, isValidNextBid, minimumNextBid } from './bid.js';

describe('minimumNextBid', () => {
  it('is the starting price when there are no bids yet', () => {
    expect(minimumNextBid(null, 50_000)).toBe(50_000);
  });

  it('is the current bid plus the increment when there is a current bid', () => {
    expect(minimumNextBid(50_000, 50_000)).toBe(50_000 + MIN_BID_INCREMENT_COP);
  });
});

describe('isValidNextBid', () => {
  it('accepts an amount equal to the starting price when there are no bids yet', () => {
    expect(isValidNextBid(50_000, null, 50_000)).toBe(true);
  });

  it('rejects an amount below the starting price when there are no bids yet', () => {
    expect(isValidNextBid(49_999, null, 50_000)).toBe(false);
  });

  it('accepts an amount that beats the current bid by exactly the increment', () => {
    expect(isValidNextBid(50_000 + MIN_BID_INCREMENT_COP, 50_000, 50_000)).toBe(true);
  });

  it('rejects an amount that beats the current bid by less than the increment', () => {
    expect(isValidNextBid(50_000 + MIN_BID_INCREMENT_COP - 1, 50_000, 50_000)).toBe(false);
  });

  it('accepts the current leader raising their own bid', () => {
    expect(isValidNextBid(60_000, 50_000, 50_000)).toBe(true);
  });

  it('rejects a non-integer amount', () => {
    expect(isValidNextBid(50_000.5, null, 50_000)).toBe(false);
  });

  it('rejects an amount above the maximum price', () => {
    expect(isValidNextBid(MAX_PRICE_COP + 1, null, MAX_PRICE_COP)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(isValidNextBid(Number.NaN, null, 50_000)).toBe(false);
  });
});

describe('BID_WINDOW_MS', () => {
  it('is 30 minutes in milliseconds', () => {
    expect(BID_WINDOW_MS).toBe(30 * 60 * 1000);
  });
});
