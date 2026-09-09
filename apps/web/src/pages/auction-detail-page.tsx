import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicAuction, PublicBid, PublicUser } from '@thrift-loop/shared';
import { fetchAuctionDetail, fetchBids, fetchCurrentUser } from '../lib/api-client.js';
import { formatCOP } from '../lib/format.js';
import { Countdown } from '../components/molecules/countdown.js';
import { BidHistory } from '../components/molecules/bid-history.js';
import { BidForm } from '../components/organisms/bid-form.js';

const POLL_INTERVAL_MS = 5000;

interface DetailState {
  auction: PublicAuction;
  serverOffsetMs: number;
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
    return null;
  }

  if (notFound || !detail) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 pt-20">
        <p className="text-sm text-gray-500">Auction not found.</p>
      </main>
    );
  }

  const { auction, serverOffsetMs } = detail;
  const canBid = user !== null && user.id !== auction.userId && auction.status === 'published';

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 pt-20">
      {auction.photoUrls[0] && (
        <img
          src={auction.photoUrls[0]}
          alt={auction.category}
          className="mb-4 aspect-square w-full rounded-lg object-cover"
        />
      )}
      <h1 className="mb-1 text-xl font-bold text-gray-900">{auction.title}</h1>
      <p className="mb-2 text-sm text-gray-600">{auction.location}</p>
      <p className="mb-4 whitespace-pre-wrap text-sm text-gray-700">{auction.description}</p>
      <p className="text-sm text-gray-500">
        {auction.currentBidCOP === null ? 'Starting at' : 'Current bid'}
      </p>
      <p className="mb-2 text-3xl font-bold text-gray-900">
        {formatCOP(auction.currentBidCOP ?? auction.priceCOP)}
      </p>
      <div className="mb-4">
        <Countdown
          endsAt={auction.bidEndsAt}
          serverOffsetMs={serverOffsetMs}
          onExpire={() => void load()}
        />
      </div>

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

      <h2 className="mb-2 text-lg font-semibold text-gray-900">Bid history</h2>
      <BidHistory bids={bids} />
    </main>
  );
}
