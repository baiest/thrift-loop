import { useEffect, useState } from 'react';
import type { PublicNotification } from '@thrift-loop/shared';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../lib/api-client.js';
import { NotificationItem } from '../molecules/notification-item.js';
import { NotificationItemSkeleton } from '../molecules/notification-item-skeleton.js';
import { useRealtimeStore } from '../../stores/realtime-store.js';

const SKELETON_ROW_COUNT = 4;

function markAllAsRead(notifications: readonly PublicNotification[]): PublicNotification[] {
  const readAt = new Date().toISOString();
  return notifications.map((notification) => ({ ...notification, readAt }));
}

function markOneAsRead(
  notifications: readonly PublicNotification[],
  id: string,
  readAt: string,
): PublicNotification[] {
  return notifications.map((notification) =>
    notification.id === id ? { ...notification, readAt } : notification,
  );
}

export function NotificationPanel(): React.JSX.Element {
  const [notifications, setNotifications] = useState<PublicNotification[]>([]);
  const [loading, setLoading] = useState(true);
  // The badge NotificationBell renders reads this shared store, not this
  // panel's own state — without writing through it here too, marking as read
  // updated this list's checkmarks but left the badge showing a stale count
  // until the next full fetch.
  const unreadCount = useRealtimeStore((state) => state.unreadCount);
  const setUnreadCount = useRealtimeStore((state) => state.setUnreadCount);

  useEffect(() => {
    void fetchNotifications().then((result) => {
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setLoading(false);
    });
    // setUnreadCount is a stable Zustand action reference; this should only
    // run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAllRead = (): void => {
    void markAllNotificationsRead().then(() => {
      setNotifications(markAllAsRead);
      setUnreadCount(0);
    });
  };

  const handleRead = (id: string): void => {
    void markNotificationRead(id).then((updated) => {
      setNotifications((current) => markOneAsRead(current, id, updated.readAt ?? ''));
      // Read the store fresh rather than closing over `unreadCount`: a rapid
      // second click must decrement from the value the first click already
      // wrote, not from the render this handler was created in.
      const current = useRealtimeStore.getState().unreadCount;
      setUnreadCount(Math.max(0, current - 1));
    });
  };

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <NotificationItemSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="mb-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-brand-600 hover:bg-brand-50"
        >
          Mark all read
        </button>
      )}
      {notifications.length === 0 ? (
        <p className="p-3 text-sm text-ink-soft">No notifications yet.</p>
      ) : (
        <ul className="space-y-1">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationItem notification={notification} onRead={handleRead} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
