import type { Auction } from '../models/auction.js';

export type AuctionPatch = Partial<
  Pick<
    Auction,
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

export interface AuctionRepository {
  findById(id: string): Promise<Auction | null>;
  findByUserId(userId: string): Promise<Auction[]>;
  findDueForPublish(before: Date): Promise<Auction[]>;
  findAllPublished(): Promise<Auction[]>;
  findDueForClose(before: Date): Promise<Auction[]>;
  findWonByUserId(userId: string): Promise<Auction[]>;
  save(auction: Auction): Promise<void>;
  update(id: string, patch: AuctionPatch): Promise<Auction | null>;
  delete(id: string): Promise<void>;
  addPhotoKeys(id: string, keys: string[]): Promise<Auction | null>;
}
