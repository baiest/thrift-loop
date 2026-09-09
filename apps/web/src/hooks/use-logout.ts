import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth-store.js';

/** Logs the current user out, clears the session store, and returns to /login. */
export function useLogout(): () => Promise<void> {
  const navigate = useNavigate();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useCallback(async () => {
    await logout();
    clearUser();
    void navigate('/login');
  }, [navigate, clearUser]);
}
