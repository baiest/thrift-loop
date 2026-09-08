import type { ItemCategory } from '@thrift-loop/shared';
import type { Auction } from '../models/auction.js';

export type AuctionPatch = Partial<
  Pick<
    Auction,
    | 'title'
    | 'category'
    | 'condition'
    | 'priceCOP'
    | 'publishAt'
    | 'status'
    | 'deliveryMethod'
    | 'currentBidCOP'
    | 'bidCount'
    | 'bidEndsAt'
    | 'winnerUserId'
  >
>;

/**
 * Filters over fields that live on Auction itself. A future simple filter
 * (condition, delivery method, ...) is one new optional field here plus one
 * predicate in the JSON repository's findAllPublished. A filter that needs
 * another entity's data (e.g. the seller's city) does NOT belong here — see
 * auction.service.ts's listPublishedAuctions for that seam instead.
 */
export interface AuctionFilter {
  search?: string;
  category?: ItemCategory;
  minPriceCOP?: number;
  maxPriceCOP?: number;
}

export interface AuctionRepository {
  findById(id: string): Promise<Auction | null>;
  findByUserId(userId: string): Promise<Auction[]>;
  findDueForPublish(before: Date): Promise<Auction[]>;
  findAllPublished(filter?: AuctionFilter): Promise<Auction[]>;
  findDueForClose(before: Date): Promise<Auction[]>;
  findWonByUserId(userId: string): Promise<Auction[]>;
  save(auction: Auction): Promise<void>;
  update(id: string, patch: AuctionPatch): Promise<Auction | null>;
  delete(id: string): Promise<void>;
  addPhotoKeys(id: string, keys: string[]): Promise<Auction | null>;
}
