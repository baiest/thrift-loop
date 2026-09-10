import type { PublicAuction } from '@thrift-loop/shared';
import type { AuctionUpdate } from '../stores/realtime-store.js';

/** Merges a live realtime update over a fetched auction. Falls back to the
 * fetched value for any field the update hasn't actually touched — a
 * presence-only or auction-closed-only message doesn't carry price/bid-count/
 * bidEndsAt, and overwriting those unconditionally would zero them out. */
export function withLiveAuctionUpdate(
  auction: PublicAuction,
  update: AuctionUpdate | null | undefined,
): PublicAuction {
  if (!update) {
    return auction;
  }
  return {
    ...auction,
    currentBidCOP: update.currentBidCOP ?? auction.currentBidCOP,
    bidCount: update.bidCount || auction.bidCount,
    bidEndsAt: update.bidEndsAt ?? auction.bidEndsAt,
    ...(update.closed && { status: 'sold', winnerUserId: update.winnerUserId }),
  };
}
