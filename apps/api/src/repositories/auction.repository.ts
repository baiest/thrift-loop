import type { Auction } from '../models/auction.js';

export type AuctionPatch = Partial<
  Pick<Auction, 'category' | 'condition' | 'priceCOP' | 'publishAt' | 'status' | 'deliveryMethod'>
>;

export interface AuctionRepository {
  findById(id: string): Promise<Auction | null>;
  findByUserId(userId: string): Promise<Auction[]>;
  findDueForPublish(before: Date): Promise<Auction[]>;
  save(auction: Auction): Promise<void>;
  update(id: string, patch: AuctionPatch): Promise<Auction | null>;
  delete(id: string): Promise<void>;
  addPhotoKeys(id: string, keys: string[]): Promise<Auction | null>;
}
