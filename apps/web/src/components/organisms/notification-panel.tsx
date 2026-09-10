import { useEffect, useState } from 'react';
import type { PublicNotification } from '@thrift-loop/shared';
import { fetchNotifications, markAllNotificationsRead } from '../../lib/api-client.js';
import { NotificationItem } from '../molecules/notification-item.js';
import { useRealtimeStore } from '../../stores/realtime-store.js';

function markAllAsRead(notifications: readonly PublicNotification[]): PublicNotification[] {
  const readAt = new Date().toISOString();
  return notifications.map((notification) => ({ ...notification, readAt }));
}

export function NotificationPanel(): React.JSX.Element {
  const [notifications, setNotifications] = useState<PublicNotification[]>([]);
  const [loading, setLoading] = useState(true);
  // The badge NotificationBell renders reads this shared store, not this
  // panel's own state — without writing through it here too, marking all as
  // read updated this list's checkmarks but left the badge showing a stale
  // count until the next full fetch.
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

  if (loading) {
    return <p className="p-3 text-sm text-ink-soft">Loading…</p>;
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
              <NotificationItem notification={notification} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
