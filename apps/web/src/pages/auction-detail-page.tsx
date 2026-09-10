import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicAuction, PublicBid, PublicUser } from '@thrift-loop/shared';
import {
  fetchAuctionDetail,
  fetchBids,
  fetchCurrentUser,
  updateAuction,
} from '../lib/api-client.js';
import { formatCOP } from '../lib/format.js';
import { Countdown } from '../components/molecules/countdown.js';
import { BidHistory } from '../components/molecules/bid-history.js';
import { BidForm } from '../components/organisms/bid-form.js';
import { Button } from '../components/atoms/button.js';
import { Skeleton } from '../components/atoms/skeleton.js';
import { PhotoPlaceholder } from '../components/atoms/photo-placeholder.js';
import { useAuctionRealtime } from '../hooks/use-auction-realtime.js';
import { useRealtimeStore, type AuctionUpdate } from '../stores/realtime-store.js';

const STALE_AFTER_MS = 15_000;

/** True once `status` has stayed 'reconnecting' for longer than `staleAfterMs`. */
function useIsStaleConnection(status: string, staleAfterMs: number): boolean {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (status !== 'reconnecting') {
      setStale(false);
      return;
    }
    const timer = setTimeout(() => setStale(true), staleAfterMs);
    return () => clearTimeout(timer);
  }, [status, staleAfterMs]);

  return stale;
}

function ViewerCount({ viewers }: { readonly viewers: number }): React.JSX.Element | null {
  if (viewers <= 0) {
    return null;
  }
  return (
    <p className="mb-4 text-xs text-ink-soft">
      {viewers} {viewers === 1 ? 'person' : 'people'} viewing
    </p>
  );
}

function AuctionPhoto({
  auction,
  photoFailed,
  onPhotoError,
}: {
  readonly auction: PublicAuction;
  readonly photoFailed: boolean;
  readonly onPhotoError: () => void;
}): React.JSX.Element {
  if (!auction.photoUrls[0] || photoFailed) {
    return <PhotoPlaceholder className="aspect-square" />;
  }
  return (
    <img
      src={auction.photoUrls[0]}
      alt={auction.category}
      onError={onPhotoError}
      className="aspect-square w-full rounded-lg object-cover"
    />
  );
}

function withLiveUpdate(auction: PublicAuction, update: AuctionUpdate | null): PublicAuction {
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

interface DetailState {
  auction: PublicAuction;
  serverOffsetMs: number;
}

function canUserBid(user: PublicUser | null, auction: PublicAuction): boolean {
  return user !== null && user.id !== auction.userId && auction.status === 'published';
}

function canUserPublish(user: PublicUser | null, auction: PublicAuction): boolean {
  return user !== null && user.id === auction.userId && auction.status === 'draft';
}

export function AuctionDetailPage(): React.JSX.Element | null {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [bids, setBids] = useState<PublicBid[]>([]);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photoFailed, setPhotoFailed] = useState(false);
  const { update, viewers } = useAuctionRealtime(id);
  const resyncToken = useRealtimeStore((state) => state.resyncToken);
  const connectionStatus = useRealtimeStore((state) => state.status);
  const showReconnecting = useIsStaleConnection(connectionStatus, STALE_AFTER_MS);

  const load = useCallback(async (): Promise<void> => {
    if (!id) {
      return;
    }
    const [result, fetchedBids] = await Promise.all([fetchAuctionDetail(id), fetchBids(id)]);
    if (!result) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setDetail({
      auction: result.auction,
      serverOffsetMs: Date.now() - new Date(result.serverTime).getTime(),
    });
    setBids(fetchedBids);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void fetchCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    void load();
  }, [load, resyncToken]);

  if (loading) {
    return (
      <div
        aria-label="Loading auction details"
        className="mx-auto grid max-w-4xl gap-6 py-6 lg:grid-cols-2"
      >
        <Skeleton className="aspect-square w-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col py-6">
        <p className="text-sm text-ink-soft">Auction not found.</p>
      </div>
    );
  }

  const { serverOffsetMs } = detail;
  const auction = withLiveUpdate(detail.auction, update);
  const canBid = canUserBid(user, auction);
  const canPublish = canUserPublish(user, auction);

  async function handlePublish(): Promise<void> {
    await updateAuction(auction.id, { status: 'published' });
    await load();
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col py-6">
      {showReconnecting && <p className="mb-4 text-xs font-medium text-amber-700">Reconnecting…</p>}
      <div className="grid gap-8 lg:grid-cols-2">
        <AuctionPhoto
          auction={auction}
          photoFailed={photoFailed}
          onPhotoError={() => setPhotoFailed(true)}
        />

        <div className="flex flex-col">
          <h1 className="mb-1 font-display text-3xl font-bold text-ink">{auction.title}</h1>
          <p className="mb-2 text-sm text-ink-soft">{auction.location}</p>
          <p className="mb-4 whitespace-pre-wrap text-sm text-ink-soft">{auction.description}</p>
          <p className="text-sm text-ink-soft">
            {auction.currentBidCOP === null ? 'Starting at' : 'Current bid'}
          </p>
          <p className="mb-2 text-3xl font-bold text-ink">
            {formatCOP(auction.currentBidCOP ?? auction.priceCOP)}
          </p>
          <div className="mb-4">
            <Countdown
              endsAt={auction.bidEndsAt}
              serverOffsetMs={serverOffsetMs}
              onExpire={() => void load()}
            />
          </div>
          <ViewerCount viewers={viewers} />

          {canPublish && (
            <div className="mb-6">
              <Button type="button" onClick={() => void handlePublish()}>
                Publish now
              </Button>
            </div>
          )}

          {canBid && (
            <div className="mb-6">
              <BidForm
                auctionId={auction.id}
                currentBidCOP={auction.currentBidCOP}
                priceCOP={auction.priceCOP}
                onBidPlaced={() => void load()}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold text-ink">Bid history</h2>
        <BidHistory bids={bids} />
      </div>
    </div>
  );
}
