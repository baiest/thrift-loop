import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser, logout } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { Button } from '../components/atoms/button.js';

export function HomePage(): React.JSX.Element | null {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
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

  async function handleLogout(): Promise<void> {
    await logout();
    clearUser();
    void navigate('/login');
  }

  if (checkingSession || !user) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6 pt-20">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Welcome, {user.firstName}</h1>
      <p className="mb-6 text-sm text-gray-600">{user.city}, Colombia</p>
      <Button onClick={() => void handleLogout()}>Log out</Button>
    </main>
  );
}
