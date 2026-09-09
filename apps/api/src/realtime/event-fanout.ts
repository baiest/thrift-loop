import type { ServerMessage } from '@thrift-loop/shared';
import type { DomainEvent, EventBus } from '../lib/event-bus.js';
import type { NotificationService } from '../services/notification.service.js';
import type { RealtimeHub } from './realtime-hub.js';

async function pushNotifications(
  hub: RealtimeHub,
  notificationService: NotificationService,
  event: DomainEvent,
): Promise<void> {
  const entries = await notificationService.recordForEventWithRecipients(event);
  for (const { userId, notification } of entries) {
    const { unreadCount } = await notificationService.list(userId);
    const message: ServerMessage = { type: 'notification', notification, unreadCount };
    hub.broadcast(`user:${userId}`, message);
  }
}

function broadcastAuctionUpdate(hub: RealtimeHub, event: DomainEvent): void {
  const serverTime = new Date().toISOString();
  const message: ServerMessage =
    event.type === 'bid-placed'
      ? {
          type: 'auction-updated',
          auctionId: event.auctionId,
          currentBidCOP: event.amountCOP,
          bidCount: event.bidCount,
          bidEndsAt: event.bidEndsAt,
          serverTime,
        }
      : {
          type: 'auction-closed',
          auctionId: event.auctionId,
          winnerUserId: event.winnerUserId,
          serverTime,
        };
  hub.broadcast(`auction:${event.auctionId}`, message);
}

export function attachEventFanout(
  eventBus: EventBus,
  hub: RealtimeHub,
  notificationService: NotificationService,
): () => void {
  return eventBus.subscribe((event) => {
    pushNotifications(hub, notificationService, event).catch((error: unknown) => {
      console.error('Failed to push notification for event', error);
    });
    broadcastAuctionUpdate(hub, event);
  });
}
