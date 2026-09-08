import type { ItemCategory } from './item-category.js';
import type { ItemCondition } from './item-condition.js';
import type { DeliveryMethod } from './delivery-method.js';

export type AuctionStatus = 'draft' | 'published' | 'sold';

export interface PublicAuction {
  id: string;
  userId: string;
  title: string;
  category: ItemCategory;
  condition: ItemCondition;
  priceCOP: number;
  publishAt: string | null;
  status: AuctionStatus;
  deliveryMethod: DeliveryMethod;
  photoUrls: string[];
  currentBidCOP: number | null;
  bidCount: number;
  bidEndsAt: string | null;
  winnerUserId: string | null;
  sellerCity: string;
  createdAt: string;
  updatedAt: string;
}
