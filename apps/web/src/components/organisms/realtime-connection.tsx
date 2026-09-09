import { useEffect } from 'react';
import { useAuthStore } from '../../stores/auth-store.js';
import { useRealtimeStore } from '../../stores/realtime-store.js';
import { getSharedRealtimeClient } from '../../lib/realtime-client.js';
import { fetchNotifications } from '../../lib/api-client.js';

export function RealtimeConnection(): null {
  const user = useAuthStore((state) => state.user);
  const applyServerMessage = useRealtimeStore((state) => state.applyServerMessage);
  const setStatus = useRealtimeStore((state) => state.setStatus);
  const setUnreadCount = useRealtimeStore((state) => state.setUnreadCount);

  useEffect(() => {
    const client = getSharedRealtimeClient();
    const unsubscribeMessage = client.onMessage(applyServerMessage);
    const unsubscribeStatus = client.onStatusChange((status) => {
      setStatus(status);
      if (status === 'open') {
        void fetchNotifications().then((result) => setUnreadCount(result.unreadCount));
      }
    });

    if (user) {
      client.connect();
    } else {
      client.disconnect();
    }

    return () => {
      unsubscribeMessage();
      unsubscribeStatus();
    };
  }, [user, applyServerMessage, setStatus, setUnreadCount]);

  return null;
}
