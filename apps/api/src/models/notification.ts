import type { NotificationType } from '@thrift-loop/shared';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  auctionId: string;
  auctionTitle: string;
  amountCOP: number | null;
  actorFirstName: string | null;
  readAt: string | null;
  createdAt: string;
}
