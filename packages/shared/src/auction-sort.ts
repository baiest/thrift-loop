export const AUCTION_SORTS = ['ending-soon', 'newest', 'price-asc', 'price-desc'] as const;

export type AuctionSort = (typeof AUCTION_SORTS)[number];

export const DEFAULT_AUCTION_SORT: AuctionSort = 'newest';

const AUCTION_SORT_SET = new Set<string>(AUCTION_SORTS);

export function isAuctionSort(value: string): value is AuctionSort {
  return AUCTION_SORT_SET.has(value);
}
