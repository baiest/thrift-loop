import type { Notification } from '../models/notification.js';
import { readJsonArray, writeJsonArrayAtomic } from '../lib/json-file-store.js';
import type { NotificationRepository } from './notification.repository.js';

function byNewestFirst(a: Notification, b: Notification): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// filePath is trusted app configuration (from container.ts), never user input.
export function createJsonNotificationRepository(filePath: string): NotificationRepository {
  return {
    async findByUserId(userId, limit) {
      const notifications = await readJsonArray<Notification>(filePath);
      return notifications
        .filter((notification) => notification.userId === userId)
        .sort(byNewestFirst)
        .slice(0, limit);
    },

    async countUnread(userId) {
      const notifications = await readJsonArray<Notification>(filePath);
      return notifications.filter(
        (notification) => notification.userId === userId && notification.readAt === null,
      ).length;
    },

    async save(notification) {
      const notifications = await readJsonArray<Notification>(filePath);
      notifications.push(notification);
      await writeJsonArrayAtomic(filePath, notifications);
    },

    async saveMany(newNotifications) {
      if (newNotifications.length === 0) {
        return;
      }
      const notifications = await readJsonArray<Notification>(filePath);
      notifications.push(...newNotifications);
      await writeJsonArrayAtomic(filePath, notifications);
    },

    async markRead(userId, id) {
      const notifications = await readJsonArray<Notification>(filePath);
      const index = notifications.findIndex(
        (notification) => notification.id === id && notification.userId === userId,
      );
      if (index === -1) {
        return null;
      }
      // index comes from findIndex, a bounded array position, not attacker input.
      // eslint-disable-next-line security/detect-object-injection
      const existing = notifications[index] as Notification;
      const updated: Notification = { ...existing, readAt: new Date().toISOString() };
      // eslint-disable-next-line security/detect-object-injection
      notifications[index] = updated;
      await writeJsonArrayAtomic(filePath, notifications);
      return updated;
    },

    async markAllRead(userId) {
      const notifications = await readJsonArray<Notification>(filePath);
      const now = new Date().toISOString();
      let updatedCount = 0;
      const updated = notifications.map((notification) => {
        if (notification.userId === userId && notification.readAt === null) {
          updatedCount += 1;
          return { ...notification, readAt: now };
        }
        return notification;
      });
      if (updatedCount > 0) {
        await writeJsonArrayAtomic(filePath, updated);
      }
      return updatedCount;
    },
  };
}
