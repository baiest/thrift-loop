import { MAX_PRICE_COP } from './price.js';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;

export const MIN_BID_INCREMENT_COP = 1000;
export const BID_WINDOW_MINUTES = 30;
export const BID_WINDOW_MS = BID_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export interface PublicBid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderFirstName: string;
  amountCOP: number;
  createdAt: string;
}

export function minimumNextBid(currentBidCOP: number | null, startPriceCOP: number): number {
  return currentBidCOP === null ? startPriceCOP : currentBidCOP + MIN_BID_INCREMENT_COP;
}

export function isValidNextBid(
  amount: number,
  currentBidCOP: number | null,
  startPriceCOP: number,
): boolean {
  if (!Number.isInteger(amount) || amount > MAX_PRICE_COP) {
    return false;
  }
  return amount >= minimumNextBid(currentBidCOP, startPriceCOP);
}
