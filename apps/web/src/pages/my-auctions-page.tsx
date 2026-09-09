import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicAuction } from '@thrift-loop/shared';
import { fetchCurrentUser, fetchMyAuctions } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { AuctionGrid } from '../components/organisms/auction-grid.js';
import { Skeleton } from '../components/atoms/skeleton.js';

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
    return (
      <div aria-label="Loading my auctions" className="flex flex-col gap-3 py-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col py-6">
      <h1 className="mb-4 font-display text-3xl font-bold text-ink">My auctions</h1>
      <AuctionGrid auctions={auctions} isLoading={isLoading} error={null} currentUserId={user.id} />
    </div>
  );
}
