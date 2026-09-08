import type { ItemCategory } from './item-category.js';
import type { ItemCondition } from './item-condition.js';
import type { DeliveryMethod } from './delivery-method.js';

export type AuctionStatus = 'draft' | 'published';

export interface PublicAuction {
  id: string;
  userId: string;
  category: ItemCategory;
  condition: ItemCondition;
  priceCOP: number;
  publishAt: string | null;
  status: AuctionStatus;
  deliveryMethod: DeliveryMethod;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
}
