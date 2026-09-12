import { describe, expect, it } from 'vitest';
import { MAX_PRICE_COP } from './price.js';
import {
  BID_WINDOW_MS,
  MIN_BID_INCREMENT_COP,
  isValidMaxBidIncrement,
  isValidNextBid,
  maximumNextBid,
  minimumNextBid,
} from './bid.js';

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
    expect(isValidNextBid(50_000, null, 50_000, MAX_PRICE_COP)).toBe(true);
  });

  it('rejects an amount below the starting price when there are no bids yet', () => {
    expect(isValidNextBid(49_999, null, 50_000, MAX_PRICE_COP)).toBe(false);
  });

  it('accepts an amount that beats the current bid by exactly the increment', () => {
    expect(isValidNextBid(50_000 + MIN_BID_INCREMENT_COP, 50_000, 50_000, MAX_PRICE_COP)).toBe(
      true,
    );
  });

  it('rejects an amount that beats the current bid by less than the increment', () => {
    expect(isValidNextBid(50_000 + MIN_BID_INCREMENT_COP - 1, 50_000, 50_000, MAX_PRICE_COP)).toBe(
      false,
    );
  });

  it('accepts the current leader raising their own bid', () => {
    expect(isValidNextBid(60_000, 50_000, 50_000, MAX_PRICE_COP)).toBe(true);
  });

  it('rejects a non-integer amount', () => {
    expect(isValidNextBid(50_000.5, null, 50_000, MAX_PRICE_COP)).toBe(false);
  });

  it('rejects an amount above the maximum price', () => {
    expect(isValidNextBid(MAX_PRICE_COP + 1, null, MAX_PRICE_COP, MAX_PRICE_COP)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(isValidNextBid(Number.NaN, null, 50_000, MAX_PRICE_COP)).toBe(false);
  });

  it('accepts an amount exactly at the max-increment ceiling', () => {
    expect(isValidNextBid(55_000, 50_000, 40_000, 5_000)).toBe(true);
  });

  it('rejects an amount one COP above the max-increment ceiling', () => {
    expect(isValidNextBid(55_001, 50_000, 40_000, 5_000)).toBe(false);
  });

  it('measures the ceiling from the starting price when there are no bids yet', () => {
    expect(isValidNextBid(45_000, null, 40_000, 5_000)).toBe(true);
    expect(isValidNextBid(45_001, null, 40_000, 5_000)).toBe(false);
  });
});

describe('maximumNextBid', () => {
  it('is the starting price plus the cap when there are no bids yet', () => {
    expect(maximumNextBid(null, 40_000, 5_000)).toBe(45_000);
  });

  it('is the current bid plus the cap when there is a current bid', () => {
    expect(maximumNextBid(50_000, 40_000, 5_000)).toBe(55_000);
  });

  it('clamps to the global maximum price', () => {
    expect(maximumNextBid(MAX_PRICE_COP - 1, 40_000, 5_000)).toBe(MAX_PRICE_COP);
  });
});

describe('isValidMaxBidIncrement', () => {
  it('accepts a cap equal to the minimum bid increment', () => {
    expect(isValidMaxBidIncrement(MIN_BID_INCREMENT_COP)).toBe(true);
  });

  it('rejects a cap below the minimum bid increment', () => {
    expect(isValidMaxBidIncrement(MIN_BID_INCREMENT_COP - 1)).toBe(false);
  });

  it('rejects a non-integer cap', () => {
    expect(isValidMaxBidIncrement(1500.5)).toBe(false);
  });

  it('rejects a cap above the maximum price', () => {
    expect(isValidMaxBidIncrement(MAX_PRICE_COP + 1)).toBe(false);
  });

  it('accepts a cap equal to the maximum price', () => {
    expect(isValidMaxBidIncrement(MAX_PRICE_COP)).toBe(true);
  });
});

describe('BID_WINDOW_MS', () => {
  it('is 30 minutes in milliseconds', () => {
    expect(BID_WINDOW_MS).toBe(30 * 60 * 1000);
  });
});
