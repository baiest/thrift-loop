import type { Bid } from '../models/bid.js';
import { readJsonArray, writeJsonArrayAtomic } from '../lib/json-file-store.js';
import type { BidRepository } from './bid.repository.js';

function byNewestFirst(a: Bid, b: Bid): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// filePath is trusted app configuration (from container.ts), never user input.
export function createJsonBidRepository(filePath: string): BidRepository {
  return {
    async findByAuctionId(auctionId) {
      const bids = await readJsonArray<Bid>(filePath);
      return bids.filter((bid) => bid.auctionId === auctionId).sort(byNewestFirst);
    },

    async save(bid) {
      const bids = await readJsonArray<Bid>(filePath);
      bids.push(bid);
      await writeJsonArrayAtomic(filePath, bids);
    },
  };
}
