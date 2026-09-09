import type {
  AuctionStatus,
  DeliveryMethod,
  ItemCategory,
  ItemCondition,
} from '@thrift-loop/shared';

export interface Auction {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: ItemCategory;
  condition: ItemCondition;
  priceCOP: number;
  publishAt: string | null;
  status: AuctionStatus;
  deliveryMethod: DeliveryMethod;
  photoKeys: string[];
  currentBidCOP: number | null;
  bidCount: number;
  bidEndsAt: string | null;
  winnerUserId: string | null;
  location: string;
  createdAt: string;
  updatedAt: string;
}
