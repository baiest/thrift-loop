import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@thrift-loop/shared';
import type { DomainEvent } from '../lib/event-bus.js';
import type { Notification } from '../models/notification.js';
import type { NotificationRepository } from '../repositories/notification.repository.js';
import type { User } from '../models/user.js';
import type { UserPatch, UserRepository } from '../repositories/user.repository.js';
import { HttpError } from '../lib/http-error.js';
import type { Logger } from '../lib/logger.js';
import { createNotificationService } from './notification.service.js';

interface RecordedLogCall {
  level: string;
  event: string;
  fields: Record<string, unknown>;
}

function createFakeLogger(): { logger: Logger; calls: RecordedLogCall[] } {
  const calls: RecordedLogCall[] = [];
  const record =
    (level: string) =>
    (event: string, fields: Record<string, unknown> = {}) => {
      calls.push({ level, event, fields });
    };
  return {
    calls,
    logger: {
      info: record('info'),
      warning: record('warning'),
      error: record('error'),
      critical: record('critical'),
      time: async (_event, _fields, fn) => fn(),
      close: async () => {},
    },
  };
}

class FakeNotificationRepository implements NotificationRepository {
  readonly items: Notification[] = [];

  findByUserId(userId: string, limit: number): Promise<Notification[]> {
    return Promise.resolve(
      this.items
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    );
  }

  countUnread(userId: string): Promise<number> {
    return Promise.resolve(
      this.items.filter((n) => n.userId === userId && n.readAt === null).length,
    );
  }

  save(notification: Notification): Promise<void> {
    this.items.push(notification);
    return Promise.resolve();
  }

  saveMany(notifications: readonly Notification[]): Promise<void> {
    this.items.push(...notifications);
    return Promise.resolve();
  }

  markRead(userId: string, id: string): Promise<Notification | null> {
    const index = this.items.findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) {
      return Promise.resolve(null);
    }
    // index comes from findIndex, a bounded array position, not attacker input.
    // eslint-disable-next-line security/detect-object-injection
    const existing = this.items[index] as Notification;
    const updated = { ...existing, readAt: new Date().toISOString() };
    // eslint-disable-next-line security/detect-object-injection
    this.items[index] = updated;
    return Promise.resolve(updated);
  }

  markAllRead(userId: string): Promise<number> {
    let count = 0;
    for (let i = 0; i < this.items.length; i += 1) {
      // i is a bounded loop counter, not attacker input.
      // eslint-disable-next-line security/detect-object-injection
      const item = this.items[i] as Notification;
      if (item.userId === userId && item.readAt === null) {
        // eslint-disable-next-line security/detect-object-injection
        this.items[i] = { ...item, readAt: new Date().toISOString() };
        count += 1;
      }
    }
    return Promise.resolve(count);
  }
}

class FakeUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  seed(user: User): void {
    this.users.set(user.id, user);
  }

  findByPhone(): Promise<User | null> {
    return Promise.resolve(null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  save(user: User): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }

  update(id: string, patch: UserPatch): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.users.set(id, updated);
    return Promise.resolve(updated);
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'USR-1',
    phone: '3000000000',
    firstName: 'Ana',
    lastName: 'Gómez',
    city: 'Bogotá D.C.',
    country: 'CO',
    passwordHash: 'x',
    address: null,
    categoryPreference: null,
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
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
  bidEndsAt: null,
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

describe('NotificationService', () => {
  let notificationRepository: FakeNotificationRepository;
  let userRepository: FakeUserRepository;
  let logCalls: RecordedLogCall[];
  let service: ReturnType<typeof createNotificationService>;

  beforeEach(() => {
    notificationRepository = new FakeNotificationRepository();
    userRepository = new FakeUserRepository();
    userRepository.seed(makeUser({ id: 'USR-owner' }));
    userRepository.seed(makeUser({ id: 'USR-previous' }));
    userRepository.seed(makeUser({ id: 'USR-winner' }));
    const fakeLogger = createFakeLogger();
    logCalls = fakeLogger.calls;
    service = createNotificationService(notificationRepository, userRepository, fakeLogger.logger);
  });

  describe('recordForEvent', () => {
    it('notifies the previous top bidder that they were outbid', async () => {
      const created = await service.recordForEvent(bidPlacedEvent);

      expect(created).toContainEqual(
        expect.objectContaining({ type: 'outbid', auctionId: 'AUC-1', amountCOP: 60_000 }),
      );
    });

    it('notifies the auction owner that someone bid on their listing', async () => {
      const created = await service.recordForEvent(bidPlacedEvent);

      expect(created).toContainEqual(
        expect.objectContaining({
          type: 'bid-on-my-listing',
          actorFirstName: 'Bea',
          amountCOP: 60_000,
        }),
      );
    });

    it('does not notify when there is no previous top bidder', async () => {
      const created = await service.recordForEvent({
        ...bidPlacedEvent,
        previousTopBidderId: null,
      });

      expect(created.some((n) => n.type === 'outbid')).toBe(false);
    });

    it('does not notify a bidder who outbids themselves', async () => {
      const created = await service.recordForEvent({
        ...bidPlacedEvent,
        previousTopBidderId: 'USR-bidder',
      });

      expect(created.some((n) => n.type === 'outbid')).toBe(false);
    });

    it('respects the outbid preference being off', async () => {
      userRepository.seed(
        makeUser({
          id: 'USR-previous',
          notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, outbid: false },
        }),
      );

      const created = await service.recordForEvent(bidPlacedEvent);

      expect(created.some((n) => n.type === 'outbid')).toBe(false);
    });

    it('respects the bidOnMyListing preference being off', async () => {
      userRepository.seed(
        makeUser({
          id: 'USR-owner',
          notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, bidOnMyListing: false },
        }),
      );

      const created = await service.recordForEvent(bidPlacedEvent);

      expect(created.some((n) => n.type === 'bid-on-my-listing')).toBe(false);
    });

    it('notifies the winner when an auction closes', async () => {
      const created = await service.recordForEvent(auctionClosedEvent);

      expect(created).toEqual([
        expect.objectContaining({
          type: 'auction-won',
          auctionId: 'AUC-1',
          amountCOP: 60_000,
        }),
      ]);
    });

    it('respects the auctionWon preference being off', async () => {
      userRepository.seed(
        makeUser({
          id: 'USR-winner',
          notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, auctionWon: false },
        }),
      );

      const created = await service.recordForEvent(auctionClosedEvent);

      expect(created).toEqual([]);
    });

    it('persists every created notification in one write', async () => {
      await service.recordForEvent(bidPlacedEvent);

      expect(notificationRepository.items).toHaveLength(2);
    });

    it('logs notification_created for each saved notification', async () => {
      await service.recordForEvent(bidPlacedEvent);

      const createdEvents = logCalls.filter((call) => call.event === 'notification_created');
      expect(createdEvents).toHaveLength(2);
      expect(createdEvents[0]).toMatchObject({ level: 'info' });
    });

    it('logs notification_skipped when a recipient has the preference off', async () => {
      userRepository.seed(
        makeUser({
          id: 'USR-previous',
          notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, outbid: false },
        }),
      );

      await service.recordForEvent(bidPlacedEvent);

      expect(logCalls).toContainEqual({
        level: 'info',
        event: 'notification_skipped',
        fields: expect.objectContaining({
          reason: 'preference_disabled',
          userId: 'USR-previous',
        }) as Record<string, unknown>,
      });
    });
  });

  describe('recordForEventWithRecipients', () => {
    it('pairs each created notification with its recipient userId', async () => {
      const entries = await service.recordForEventWithRecipients(bidPlacedEvent);

      expect(entries).toContainEqual({
        userId: 'USR-previous',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest's objectContaining typing widens to `any`
        notification: expect.objectContaining({ type: 'outbid' }),
      });
      expect(entries).toContainEqual({
        userId: 'USR-owner',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest's objectContaining typing widens to `any`
        notification: expect.objectContaining({ type: 'bid-on-my-listing' }),
      });
    });

    it('persists the same notifications recordForEvent would have', async () => {
      await service.recordForEventWithRecipients(bidPlacedEvent);

      expect(notificationRepository.items).toHaveLength(2);
    });

    it('respects preferences the same way recordForEvent does', async () => {
      userRepository.seed(
        makeUser({
          id: 'USR-previous',
          notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, outbid: false },
        }),
      );

      const entries = await service.recordForEventWithRecipients(bidPlacedEvent);

      expect(entries.some((entry) => entry.notification.type === 'outbid')).toBe(false);
    });
  });

  describe('list', () => {
    it('returns notifications and the unread count for a user', async () => {
      await service.recordForEvent(bidPlacedEvent);

      const result = await service.list('USR-previous');

      expect(result.unreadCount).toBe(1);
      expect(result.notifications).toHaveLength(1);
    });
  });

  describe('markRead', () => {
    it('marks a notification read', async () => {
      const [created] = await service.recordForEvent(auctionClosedEvent);

      const updated = await service.markRead('USR-winner', created?.id ?? '');

      expect(updated.readAt).not.toBeNull();
    });

    it('rejects marking another user notification read', async () => {
      const [created] = await service.recordForEvent(auctionClosedEvent);

      await expect(service.markRead('USR-other', created?.id ?? '')).rejects.toThrow(HttpError);
    });

    it('logs notification_mark_read_failed when the notification cannot be found for that user', async () => {
      const [created] = await service.recordForEvent(auctionClosedEvent);

      await expect(service.markRead('USR-other', created?.id ?? '')).rejects.toThrow(HttpError);

      expect(logCalls).toContainEqual({
        level: 'warning',
        event: 'notification_mark_read_failed',
        fields: expect.objectContaining({ userId: 'USR-other' }) as Record<string, unknown>,
      });
    });
  });

  describe('markAllRead', () => {
    it('marks every unread notification for a user read', async () => {
      await service.recordForEvent(bidPlacedEvent);

      const updated = await service.markAllRead('USR-owner');

      expect(updated).toBe(1);
    });
  });

  describe('updatePreferences', () => {
    it('updates the given preferences and returns the public user', async () => {
      const updated = await service.updatePreferences('USR-owner', { outbid: false });

      expect(updated.notificationPreferences).toEqual({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        outbid: false,
      });
    });

    it('rejects an empty patch', async () => {
      await expect(service.updatePreferences('USR-owner', {})).rejects.toThrow(HttpError);
    });

    it('rejects a patch for a missing user', async () => {
      await expect(service.updatePreferences('USR-missing', { outbid: false })).rejects.toThrow(
        HttpError,
      );
    });
  });
});
