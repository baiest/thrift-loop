import { describe, expect, it } from 'vitest';
import { AUCTION_SORTS, DEFAULT_AUCTION_SORT, isAuctionSort } from './auction-sort.js';

describe('isAuctionSort', () => {
  it('accepts every sort in the curated list', () => {
    for (const sort of AUCTION_SORTS) {
      expect(isAuctionSort(sort)).toBe(true);
    }
  });

  it('rejects a sort not in the list', () => {
    expect(isAuctionSort('price')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isAuctionSort('')).toBe(false);
  });
});

describe('AUCTION_SORTS', () => {
  it('has exactly four options', () => {
    expect(AUCTION_SORTS).toHaveLength(4);
  });
});

describe('DEFAULT_AUCTION_SORT', () => {
  it('is newest, preserving current ordering behavior', () => {
    expect(DEFAULT_AUCTION_SORT).toBe('newest');
  });
});
