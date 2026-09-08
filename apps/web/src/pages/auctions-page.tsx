import { useEffect, useState } from 'react';
import type { PublicAuction } from '@thrift-loop/shared';
import { fetchAuctions, fetchCurrentUser } from '../lib/api-client.js';
import { AuctionGrid } from '../components/organisms/auction-grid.js';

export function AuctionsPage(): React.JSX.Element {
  const [auctions, setAuctions] = useState<PublicAuction[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    Promise.all([fetchAuctions(), fetchCurrentUser()])
      .then(([fetchedAuctions, user]) => {
        if (!isActive) {
          return;
        }
        setAuctions(fetchedAuctions);
        setCurrentUserId(user?.id ?? null);
      })
      .catch(() => {
        if (isActive) {
          setError('Could not load auctions');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 pt-20">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Auctions</h1>
      <AuctionGrid
        auctions={auctions}
        isLoading={isLoading}
        error={error}
        currentUserId={currentUserId}
      />
    </main>
  );
}
