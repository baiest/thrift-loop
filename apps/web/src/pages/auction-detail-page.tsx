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

const POLL_INTERVAL_MS = 5000;

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
  }, [load]);

  useEffect(() => {
    if (!detail || detail.auction.status !== 'published') {
      return;
    }
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [detail, load]);

  if (loading) {
    return (
      <div
        aria-label="Loading auction details"
        className="mx-auto flex max-w-2xl flex-col gap-3 py-6"
      >
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col py-6">
        <p className="text-sm text-ink-soft">Auction not found.</p>
      </div>
    );
  }

  const { auction, serverOffsetMs } = detail;
  const canBid = canUserBid(user, auction);
  const canPublish = canUserPublish(user, auction);

  async function handlePublish(): Promise<void> {
    await updateAuction(auction.id, { status: 'published' });
    await load();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col py-6">
      {auction.photoUrls[0] && (
        <img
          src={auction.photoUrls[0]}
          alt={auction.category}
          className="mb-4 aspect-square w-full rounded-lg object-cover"
        />
      )}
      <h1 className="mb-1 text-xl font-bold text-ink">{auction.title}</h1>
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

      <h2 className="mb-2 text-lg font-semibold text-ink">Bid history</h2>
      <BidHistory bids={bids} />
    </div>
  );
}
