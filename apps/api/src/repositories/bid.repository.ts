import type { Bid } from '../models/bid.js';

export interface BidRepository {
  findByAuctionId(auctionId: string): Promise<Bid[]>;
  findByUserId(userId: string): Promise<Bid[]>;
  save(bid: Bid): Promise<void>;
}
