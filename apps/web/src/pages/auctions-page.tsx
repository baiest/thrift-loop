import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicAuction } from '@thrift-loop/shared';
import { fetchAuctions, fetchCurrentUser } from '../lib/api-client.js';
import { AuctionGrid } from '../components/organisms/auction-grid.js';
import { AuctionFilters } from '../components/organisms/auction-filters.js';
import { useDebouncedValue } from '../hooks/use-debounced-value.js';

const DEBOUNCE_MS = 300;

interface Filters {
  search: string;
  category: string;
  city: string;
  minPriceCOP: string;
  maxPriceCOP: string;
}

const EMPTY_FILTERS: Filters = {
  search: '',
  category: '',
  city: '',
  minPriceCOP: '',
  maxPriceCOP: '',
};

export function AuctionsPage(): React.JSX.Element {
  const [auctions, setAuctions] = useState<PublicAuction[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const cityDefaulted = useRef(false);

  useEffect(() => {
    let isActive = true;
    void fetchCurrentUser().then((user) => {
      if (!isActive) {
        return;
      }
      setCurrentUserId(user?.id ?? null);
      if (user?.city && !cityDefaulted.current) {
        cityDefaulted.current = true;
        setFilters((current) => ({ ...current, city: user.city }));
      }
    });
    return () => {
      isActive = false;
    };
  }, []);

  const debouncedFilters = useDebouncedValue(filters, DEBOUNCE_MS);

  // Memoized so the fetch effect below only re-runs when a filter value
  // actually changes, not on every render of this page.
  const queryFilters = useMemo<Filters>(
    () => ({
      search: debouncedFilters.search,
      category: debouncedFilters.category,
      city: debouncedFilters.city,
      minPriceCOP: debouncedFilters.minPriceCOP,
      maxPriceCOP: debouncedFilters.maxPriceCOP,
    }),
    [
      debouncedFilters.search,
      debouncedFilters.category,
      debouncedFilters.city,
      debouncedFilters.minPriceCOP,
      debouncedFilters.maxPriceCOP,
    ],
  );

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    fetchAuctions(queryFilters)
      .then((fetchedAuctions) => {
        if (isActive) {
          setAuctions(fetchedAuctions);
        }
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
  }, [queryFilters]);

  return (
    <div className="flex flex-col py-6">
      <h1 className="mb-4 font-display text-3xl font-bold text-ink">Auctions</h1>
      <AuctionFilters
        value={filters}
        onChange={(next) => setFilters({ ...EMPTY_FILTERS, ...next })}
      />
      <AuctionGrid
        auctions={auctions}
        isLoading={isLoading}
        error={error}
        currentUserId={currentUserId}
      />
    </div>
  );
}
