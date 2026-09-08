import type {
  AuctionStatus,
  DeliveryMethod,
  ItemCategory,
  ItemCondition,
} from '@thrift-loop/shared';

export interface Auction {
  id: string;
  userId: string;
  category: ItemCategory;
  condition: ItemCondition;
  priceCOP: number;
  publishAt: string | null;
  status: AuctionStatus;
  deliveryMethod: DeliveryMethod;
  photoKeys: string[];
  createdAt: string;
  updatedAt: string;
}
