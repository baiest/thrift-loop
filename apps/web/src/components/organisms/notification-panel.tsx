import { useEffect, useState } from 'react';
import type { PublicNotification } from '@thrift-loop/shared';
import { fetchNotifications, markAllNotificationsRead } from '../../lib/api-client.js';
import { NotificationItem } from '../molecules/notification-item.js';

function markAllAsRead(notifications: readonly PublicNotification[]): PublicNotification[] {
  const readAt = new Date().toISOString();
  return notifications.map((notification) => ({ ...notification, readAt }));
}

export function NotificationPanel(): React.JSX.Element {
  const [notifications, setNotifications] = useState<PublicNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchNotifications().then((result) => {
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setLoading(false);
    });
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
