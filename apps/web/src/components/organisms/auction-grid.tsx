import type { PublicAuction } from '@thrift-loop/shared';
import { AuctionCard } from '../molecules/auction-card.js';
import { AuctionCardSkeleton } from '../molecules/auction-card-skeleton.js';
import { useGridRealtime } from '../../hooks/use-grid-realtime.js';
import type { AuctionUpdate } from '../../stores/realtime-store.js';

const SKELETON_CARD_COUNT = 8;

function withLiveUpdate(auction: PublicAuction, update: AuctionUpdate | undefined): PublicAuction {
  if (!update) {
    return auction;
  }
  return {
    ...auction,
    currentBidCOP: update.currentBidCOP,
    bidCount: update.bidCount,
    bidEndsAt: update.bidEndsAt,
    ...(update.closed && { status: 'sold', winnerUserId: update.winnerUserId }),
  };
}

export interface AuctionGridProps {
  readonly auctions: readonly PublicAuction[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly currentUserId: string | null;
  readonly myBidsByAuctionId?: ReadonlyMap<string, number>;
}

export function AuctionGrid({
  auctions,
  isLoading,
  error,
  currentUserId,
  myBidsByAuctionId,
}: AuctionGridProps): React.JSX.Element {
  const auctionUpdates = useGridRealtime();

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
    return <p className="text-sm text-ink-soft">No auctions yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {auctions.map((auction) => (
        <AuctionCard
          key={auction.id}
          auction={withLiveUpdate(auction, auctionUpdates[auction.id])}
          isOwn={auction.userId === currentUserId}
          myBidCOP={myBidsByAuctionId?.get(auction.id)}
        />
      ))}
    </div>
  );
}
