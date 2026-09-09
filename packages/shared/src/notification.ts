export const NOTIFICATION_TYPES = ['outbid', 'auction-won', 'bid-on-my-listing'] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const NOTIFICATION_TYPE_SET = new Set<string>(NOTIFICATION_TYPES);

export function isNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_TYPE_SET.has(value);
}

export interface PublicNotification {
  id: string;
  type: NotificationType;
  auctionId: string;
  auctionTitle: string;
  amountCOP: number | null;
  actorFirstName: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  outbid: boolean;
  auctionWon: boolean;
  bidOnMyListing: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  outbid: true,
  auctionWon: true,
  bidOnMyListing: true,
};
