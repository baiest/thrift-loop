import type { Notification } from '../models/notification.js';

export interface NotificationRepository {
  findByUserId(userId: string, limit: number): Promise<Notification[]>;
  countUnread(userId: string): Promise<number>;
  save(notification: Notification): Promise<void>;
  saveMany(notifications: readonly Notification[]): Promise<void>;
  markRead(userId: string, id: string): Promise<Notification | null>;
  markAllRead(userId: string): Promise<number>;
}
