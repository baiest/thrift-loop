import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicAuction } from '@thrift-loop/shared';
import { fetchCurrentUser, fetchMyAuctions } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { AuctionGrid } from '../components/organisms/auction-grid.js';

export function MyAuctionsPage(): React.JSX.Element | null {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [checkingSession, setCheckingSession] = useState(user === null);
  const [auctions, setAuctions] = useState<PublicAuction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    if (!user) {
      return;
    }
    setIsLoading(true);
    void fetchMyAuctions()
      .then(setAuctions)
      .finally(() => setIsLoading(false));
  }, [user]);

  if (checkingSession || !user) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 pt-20">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">My auctions</h1>
      <AuctionGrid auctions={auctions} isLoading={isLoading} error={null} currentUserId={user.id} />
    </main>
  );
}
