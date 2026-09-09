import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { ServerMessage } from '@thrift-loop/shared';
import type { DomainEvent, EventBus } from '../lib/event-bus.js';
import type { NotificationService } from '../services/notification.service.js';
import { createRealtimeHub, type SocketLike } from './realtime-hub.js';
import { attachEventFanout } from './event-fanout.js';

class FakeSocket implements SocketLike {
  readonly sent: string[] = [];
  close(): void {}
  send(data: string): void {
    this.sent.push(data);
  }
  messages(): ServerMessage[] {
    return this.sent.map((raw) => JSON.parse(raw) as ServerMessage);
  }
}

class FakeEventBus implements EventBus {
  private listener: ((event: DomainEvent) => void) | null = null;

  publish(event: DomainEvent): void {
    this.listener?.(event);
  }

  subscribe(listener: (event: DomainEvent) => void): () => void {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
}

const bidPlacedEvent: DomainEvent = {
  type: 'bid-placed',
  auctionId: 'AUC-1',
  auctionTitle: 'Chaqueta de cuero',
  ownerUserId: 'USR-owner',
  bidderId: 'USR-bidder',
  bidderFirstName: 'Bea',
  amountCOP: 60_000,
  bidCount: 2,
  bidEndsAt: '2026-01-01T00:30:00.000Z',
  previousTopBidderId: 'USR-previous',
  occurredAt: '2026-01-01T00:00:00.000Z',
};

const auctionClosedEvent: DomainEvent = {
  type: 'auction-closed',
  auctionId: 'AUC-1',
  auctionTitle: 'Chaqueta de cuero',
  ownerUserId: 'USR-owner',
  winnerUserId: 'USR-winner',
  finalPriceCOP: 60_000,
  occurredAt: '2026-01-01T00:00:00.000Z',
};

function makeFakeNotificationService(
  recipients: { userId: string; type: string }[],
): NotificationService {
  return {
    recordForEvent: vi.fn(),
    recordForEventWithRecipients: vi.fn().mockResolvedValue(
      recipients.map(({ userId, type }) => ({
        userId,
        notification: {
          id: `NTF-${userId}`,
          type,
          auctionId: 'AUC-1',
          auctionTitle: 'Chaqueta de cuero',
          amountCOP: 60_000,
          actorFirstName: 'Bea',
          readAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      })),
    ),
    list: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 1 }),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    updatePreferences: vi.fn(),
  };
}

describe('attachEventFanout', () => {
  let consoleErrorSpy: MockInstance<(...args: unknown[]) => void>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('pushes a notification message with the unread count to the recipient user room', async () => {
    const eventBus = new FakeEventBus();
    const hub = createRealtimeHub();
    const fakeSocket = new FakeSocket();
    hub.addConnection('USR-previous', fakeSocket);
    const notificationService = makeFakeNotificationService([
      { userId: 'USR-previous', type: 'outbid' },
    ]);
    attachEventFanout(eventBus, hub, notificationService);

    eventBus.publish(bidPlacedEvent);
    await vi.waitFor(() => {
      expect(fakeSocket.messages()).toContainEqual(
        expect.objectContaining({
          type: 'notification',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest's objectContaining typing widens to `any`
          notification: expect.objectContaining({ type: 'outbid' }),
          unreadCount: 1,
        }),
      );
    });
  });

  it('broadcasts auction-updated to the auction room on bid-placed', async () => {
    const eventBus = new FakeEventBus();
    const hub = createRealtimeHub();
    const fakeSocket = new FakeSocket();
    const connection = hub.addConnection('USR-viewer', fakeSocket);
    hub.joinRoom(connection, 'auction:AUC-1');
    const notificationService = makeFakeNotificationService([]);
    attachEventFanout(eventBus, hub, notificationService);

    eventBus.publish(bidPlacedEvent);
    await vi.waitFor(() => {
      expect(fakeSocket.messages()).toContainEqual(
        expect.objectContaining({
          type: 'auction-updated',
          auctionId: 'AUC-1',
          currentBidCOP: 60_000,
          bidCount: 2,
        }),
      );
    });
  });

  it('also broadcasts auction-updated to the grid room on bid-placed', async () => {
    const eventBus = new FakeEventBus();
    const hub = createRealtimeHub();
    const fakeSocket = new FakeSocket();
    const connection = hub.addConnection('USR-viewer', fakeSocket);
    hub.joinRoom(connection, 'grid');
    const notificationService = makeFakeNotificationService([]);
    attachEventFanout(eventBus, hub, notificationService);

    eventBus.publish(bidPlacedEvent);
    await vi.waitFor(() => {
      expect(fakeSocket.messages()).toContainEqual(
        expect.objectContaining({ type: 'auction-updated', auctionId: 'AUC-1' }),
      );
    });
  });

  it('also broadcasts auction-closed to the grid room on auction-closed', async () => {
    const eventBus = new FakeEventBus();
    const hub = createRealtimeHub();
    const fakeSocket = new FakeSocket();
    const connection = hub.addConnection('USR-viewer', fakeSocket);
    hub.joinRoom(connection, 'grid');
    const notificationService = makeFakeNotificationService([]);
    attachEventFanout(eventBus, hub, notificationService);

    eventBus.publish(auctionClosedEvent);
    await vi.waitFor(() => {
      expect(fakeSocket.messages()).toContainEqual(
        expect.objectContaining({ type: 'auction-closed', auctionId: 'AUC-1' }),
      );
    });
  });

  it('broadcasts auction-closed to the auction room on auction-closed', async () => {
    const eventBus = new FakeEventBus();
    const hub = createRealtimeHub();
    const fakeSocket = new FakeSocket();
    const connection = hub.addConnection('USR-viewer', fakeSocket);
    hub.joinRoom(connection, 'auction:AUC-1');
    const notificationService = makeFakeNotificationService([]);
    attachEventFanout(eventBus, hub, notificationService);

    eventBus.publish(auctionClosedEvent);
    await vi.waitFor(() => {
      expect(fakeSocket.messages()).toContainEqual(
        expect.objectContaining({
          type: 'auction-closed',
          auctionId: 'AUC-1',
          winnerUserId: 'USR-winner',
        }),
      );
    });
  });

  it('does not let a notification-service failure prevent the auction broadcast', async () => {
    const eventBus = new FakeEventBus();
    const hub = createRealtimeHub();
    const fakeSocket = new FakeSocket();
    const connection = hub.addConnection('USR-viewer', fakeSocket);
    hub.joinRoom(connection, 'auction:AUC-1');
    const notificationService: NotificationService = {
      recordForEvent: vi.fn(),
      recordForEventWithRecipients: vi.fn().mockRejectedValue(new Error('boom')),
      list: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      updatePreferences: vi.fn(),
    };
    attachEventFanout(eventBus, hub, notificationService);

    eventBus.publish(bidPlacedEvent);
    await vi.waitFor(() => {
      expect(fakeSocket.messages()).toContainEqual(
        expect.objectContaining({ type: 'auction-updated' }),
      );
    });
  });

  it('returns an unsubscribe function', () => {
    const eventBus = new FakeEventBus();
    const hub = createRealtimeHub();
    const notificationService = makeFakeNotificationService([]);

    const unsubscribe = attachEventFanout(eventBus, hub, notificationService);
    unsubscribe();
    expect(() => eventBus.publish(bidPlacedEvent)).not.toThrow();
  });
});
