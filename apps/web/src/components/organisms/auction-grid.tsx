import type { PublicAuction } from '@thrift-loop/shared';
import { AuctionCard } from '../molecules/auction-card.js';
import { AuctionCardSkeleton } from '../molecules/auction-card-skeleton.js';

const SKELETON_CARD_COUNT = 8;

export interface AuctionGridProps {
  readonly auctions: readonly PublicAuction[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly currentUserId: string | null;
}

export function AuctionGrid({
  auctions,
  isLoading,
  error,
  currentUserId,
}: AuctionGridProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <AuctionCardSkeleton key={index} />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (auctions.length === 0) {
    return <p className="text-sm text-gray-500">No auctions yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {auctions.map((auction) => (
        <AuctionCard key={auction.id} auction={auction} isOwn={auction.userId === currentUserId} />
      ))}
    </div>
  );
}
