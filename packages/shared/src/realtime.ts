import type { PublicNotification } from './notification.js';

export const REALTIME_PATH = '/api/realtime';

const MAX_ID_LENGTH = 64;

export type ClientMessage =
  | { type: 'subscribe-auction'; auctionId: string }
  | { type: 'unsubscribe-auction'; auctionId: string }
  | { type: 'subscribe-grid' }
  | { type: 'unsubscribe-grid' }
  | { type: 'ping' };

export type ServerMessage =
  | { type: 'ready'; userId: string; serverTime: string }
  | { type: 'notification'; notification: PublicNotification; unreadCount: number }
  | {
      type: 'auction-updated';
      auctionId: string;
      currentBidCOP: number;
      bidCount: number;
      bidEndsAt: string | null;
      serverTime: string;
    }
  | { type: 'auction-closed'; auctionId: string; winnerUserId: string; serverTime: string }
  | { type: 'presence'; auctionId: string; viewers: number }
  | { type: 'pong' }
  | { type: 'error'; message: string };

function isValidAuctionId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH;
}

function parseAuctionSubscription(
  type: 'subscribe-auction' | 'unsubscribe-auction',
  body: Record<string, unknown>,
): ClientMessage | null {
  const auctionId = body['auctionId'];
  return isValidAuctionId(auctionId) ? { type, auctionId } : null;
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const body = parsed as Record<string, unknown>;
  const type = body['type'];

  switch (type) {
    case 'subscribe-auction':
    case 'unsubscribe-auction':
      return parseAuctionSubscription(type, body);
    case 'subscribe-grid':
      return { type: 'subscribe-grid' };
    case 'unsubscribe-grid':
      return { type: 'unsubscribe-grid' };
    case 'ping':
      return { type: 'ping' };
    default:
      return null;
  }
}
