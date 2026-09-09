import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../atoms/icon.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useRealtimeStore } from '../../stores/realtime-store.js';
import { fetchNotifications } from '../../lib/api-client.js';
import { NotificationPanel } from './notification-panel.js';

const MAX_BADGE_COUNT = 9;

function UnreadBadge({ count }: { readonly count: number }): React.JSX.Element | null {
  if (count <= 0) {
    return null;
  }
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
      {count > MAX_BADGE_COUNT ? '9+' : count}
    </span>
  );
}

export function NotificationBell(): React.JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const unreadCount = useRealtimeStore((state) => state.unreadCount);
  const setUnreadCount = useRealtimeStore((state) => state.setUnreadCount);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    void fetchNotifications().then((result) => setUnreadCount(result.unreadCount));
  }, [user, setUnreadCount]);

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-ink-soft hover:bg-brand-50"
      >
        <Icon name="bell" className="h-5 w-5" />
        <UnreadBadge count={unreadCount} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-lg border border-hairline bg-white p-2 shadow-lg">
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              See all
            </Link>
          </div>
          <NotificationPanel />
        </div>
      )}
    </div>
  );
}
