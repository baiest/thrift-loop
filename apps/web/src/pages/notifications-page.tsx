import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { NotificationPanel } from '../components/organisms/notification-panel.js';

export function NotificationsPage(): React.JSX.Element | null {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [checkingSession, setCheckingSession] = useState(user === null);

  useEffect(() => {
    if (user) {
      return;
    }
    void fetchCurrentUser()
      .then((currentUser) => {
        if (currentUser) {
          setUser(currentUser);
        } else {
          void navigate('/login');
        }
      })
      .finally(() => setCheckingSession(false));
  }, [user, setUser, navigate]);

  if (checkingSession || !user) {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col py-6">
      <h1 className="mb-4 font-display text-3xl font-bold text-ink">Notifications</h1>
      <NotificationPanel />
    </div>
  );
}
