import {
  type NotificationPreferences,
  type PublicNotification,
  type PublicUser,
} from '@thrift-loop/shared';
import type { DomainEvent } from '../lib/event-bus.js';
import type { Notification } from '../models/notification.js';
import type { NotificationRepository } from '../repositories/notification.repository.js';
import type { UserRepository } from '../repositories/user.repository.js';
import { createPrefixedId } from '../lib/prefixed-id.js';
import { HttpError } from '../lib/http-error.js';
import { HTTP_STATUS } from '../lib/http-status.js';
import type { Logger } from '../lib/logger.js';
import { toPublicUser } from './auth.service.js';

const NOTIFICATION_ID_PREFIX = 'NTF';
const NOTIFICATION_NOT_FOUND_MESSAGE = 'Notification not found';
const USER_NOT_FOUND_MESSAGE = 'User not found';
const DEFAULT_LIST_LIMIT = 50;

function toPublicNotification(notification: Notification): PublicNotification {
  return {
    id: notification.id,
    type: notification.type,
    auctionId: notification.auctionId,
    auctionTitle: notification.auctionTitle,
    amountCOP: notification.amountCOP,
    actorFirstName: notification.actorFirstName,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

function makeNotification(
  userId: string,
  fields: Omit<Notification, 'id' | 'userId' | 'readAt' | 'createdAt'>,
  occurredAt: string,
): Notification {
  return {
    id: createPrefixedId(NOTIFICATION_ID_PREFIX),
    userId,
    readAt: null,
    createdAt: occurredAt,
    ...fields,
  };
}

function logSkipped(logger: Logger, userId: string, type: string): void {
  logger.info('notification_skipped', { userId, type, reason: 'preference_disabled' });
}

async function buildBidPlacedNotifications(
  userRepository: UserRepository,
  logger: Logger,
  event: Extract<DomainEvent, { type: 'bid-placed' }>,
): Promise<Notification[]> {
  const notifications: Notification[] = [];

  const isSelfRaise = event.previousTopBidderId === event.bidderId;
  if (event.previousTopBidderId && !isSelfRaise) {
    const previousBidder = await userRepository.findById(event.previousTopBidderId);
    if (previousBidder?.notificationPreferences.outbid) {
      notifications.push(
        makeNotification(
          event.previousTopBidderId,
          {
            type: 'outbid',
            auctionId: event.auctionId,
            auctionTitle: event.auctionTitle,
            amountCOP: event.amountCOP,
            actorFirstName: event.bidderFirstName,
          },
          event.occurredAt,
        ),
      );
    } else if (previousBidder) {
      logSkipped(logger, event.previousTopBidderId, 'outbid');
    }
  }

  const owner = await userRepository.findById(event.ownerUserId);
  if (owner?.notificationPreferences.bidOnMyListing) {
    notifications.push(
      makeNotification(
        event.ownerUserId,
        {
          type: 'bid-on-my-listing',
          auctionId: event.auctionId,
          auctionTitle: event.auctionTitle,
          amountCOP: event.amountCOP,
          actorFirstName: event.bidderFirstName,
        },
        event.occurredAt,
      ),
    );
  } else if (owner) {
    logSkipped(logger, event.ownerUserId, 'bid-on-my-listing');
  }

  return notifications;
}

async function buildAuctionClosedNotifications(
  userRepository: UserRepository,
  logger: Logger,
  event: Extract<DomainEvent, { type: 'auction-closed' }>,
): Promise<Notification[]> {
  const winner = await userRepository.findById(event.winnerUserId);
  if (!winner?.notificationPreferences.auctionWon) {
    if (winner) {
      logSkipped(logger, event.winnerUserId, 'auction-won');
    }
    return [];
  }
  return [
    makeNotification(
      event.winnerUserId,
      {
        type: 'auction-won',
        auctionId: event.auctionId,
        auctionTitle: event.auctionTitle,
        amountCOP: event.finalPriceCOP,
        actorFirstName: null,
      },
      event.occurredAt,
    ),
  ];
}

export function createNotificationService(
  notificationRepository: NotificationRepository,
  userRepository: UserRepository,
  logger: Logger,
) {
  async function buildAndPersist(event: DomainEvent): Promise<Notification[]> {
    const notifications =
      event.type === 'bid-placed'
        ? await buildBidPlacedNotifications(userRepository, logger, event)
        : await buildAuctionClosedNotifications(userRepository, logger, event);

    await notificationRepository.saveMany(notifications);
    for (const notification of notifications) {
      logger.info('notification_created', {
        userId: notification.userId,
        type: notification.type,
        auctionId: notification.auctionId,
      });
    }
    return notifications;
  }

  return {
    async recordForEvent(event: DomainEvent): Promise<PublicNotification[]> {
      const notifications = await buildAndPersist(event);
      return notifications.map(toPublicNotification);
    },

    async recordForEventWithRecipients(
      event: DomainEvent,
    ): Promise<{ userId: string; notification: PublicNotification }[]> {
      const notifications = await buildAndPersist(event);
      return notifications.map((notification) => ({
        userId: notification.userId,
        notification: toPublicNotification(notification),
      }));
    },

    async list(
      userId: string,
    ): Promise<{ notifications: PublicNotification[]; unreadCount: number }> {
      const [notifications, unreadCount] = await Promise.all([
        notificationRepository.findByUserId(userId, DEFAULT_LIST_LIMIT),
        notificationRepository.countUnread(userId),
      ]);
      return { notifications: notifications.map(toPublicNotification), unreadCount };
    },

    async markRead(userId: string, id: string): Promise<PublicNotification> {
      const updated = await notificationRepository.markRead(userId, id);
      if (!updated) {
        logger.warning('notification_mark_read_failed', { userId, notificationId: id });
        throw new HttpError(NOTIFICATION_NOT_FOUND_MESSAGE, HTTP_STATUS.NOT_FOUND);
      }
      return toPublicNotification(updated);
    },

    async markAllRead(userId: string): Promise<number> {
      return notificationRepository.markAllRead(userId);
    },

    async updatePreferences(
      userId: string,
      patch: Partial<NotificationPreferences>,
    ): Promise<PublicUser> {
      if (Object.keys(patch).length === 0) {
        throw new HttpError('Validation failed', HTTP_STATUS.BAD_REQUEST, {
          preferences: 'Provide at least one preference to update',
        });
      }
      const existing = await userRepository.findById(userId);
      if (!existing) {
        throw new HttpError(USER_NOT_FOUND_MESSAGE, HTTP_STATUS.NOT_FOUND);
      }
      const updated = await userRepository.update(userId, {
        notificationPreferences: { ...existing.notificationPreferences, ...patch },
      });
      return toPublicUser(updated as NonNullable<typeof updated>);
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
