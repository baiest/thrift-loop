import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_AUCTION_SORT, type AuctionSort, type PublicAuction } from '@thrift-loop/shared';
import { fetchAuctions, fetchCurrentUser } from '../lib/api-client.js';
import { AuctionGrid } from '../components/organisms/auction-grid.js';
import { AuctionFilters } from '../components/organisms/auction-filters.js';
import { ResultsBar } from '../components/molecules/results-bar.js';
import { Icon } from '../components/atoms/icon.js';
import { useDebouncedValue } from '../hooks/use-debounced-value.js';

const DEBOUNCE_MS = 300;

interface Filters {
  search: string;
  category: string;
  city: string;
  minPriceCOP: string;
  maxPriceCOP: string;
  sort: AuctionSort;
}

const EMPTY_FILTERS: Filters = {
  search: '',
  category: '',
  city: '',
  minPriceCOP: '',
  maxPriceCOP: '',
  sort: DEFAULT_AUCTION_SORT,
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
  // actually changes, not on every render of this page. `sort` is read from
  // the un-debounced `filters`, not `debouncedFilters`: it's a discrete select
  // change, not typed input, so it should refetch immediately.
  const queryFilters = useMemo<Filters>(
    () => ({
      search: debouncedFilters.search,
      category: debouncedFilters.category,
      city: debouncedFilters.city,
      minPriceCOP: debouncedFilters.minPriceCOP,
      maxPriceCOP: debouncedFilters.maxPriceCOP,
      sort: filters.sort,
    }),
    [
      debouncedFilters.search,
      debouncedFilters.category,
      debouncedFilters.city,
      debouncedFilters.minPriceCOP,
      debouncedFilters.maxPriceCOP,
      filters.sort,
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
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Auctions</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Curated vintage pieces and independent designer archival garments live in Colombia.
          </p>
        </div>
        <Link
          to="/auctions/new"
          className="hidden shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 font-medium text-white hover:bg-brand-600 sm:inline-flex"
        >
          <Icon name="plus-circle" className="h-5 w-5" />
          Create auction
        </Link>
      </div>
      <AuctionFilters
        value={filters}
        onChange={(next) =>
          setFilters((current) => ({ ...EMPTY_FILTERS, ...next, sort: current.sort }))
        }
      />
      <ResultsBar
        count={auctions.length}
        sort={filters.sort}
        onSortChange={(sort) => setFilters((current) => ({ ...current, sort }))}
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
