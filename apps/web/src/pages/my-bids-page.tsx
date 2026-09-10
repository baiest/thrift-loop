import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicAuction, PublicMyBid } from '@thrift-loop/shared';
import { fetchCurrentUser, fetchMyBids } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { useGridRealtime } from '../hooks/use-grid-realtime.js';
import { withLiveAuctionUpdate } from '../lib/live-auction.js';
import { AuctionCard, type BidStatus } from '../components/molecules/auction-card.js';

// Matches the server's own definition in bid.service.ts's listMyBids exactly,
// so recomputing this client-side against a live-merged auction (instead of
// the isWinning the server computed at fetch time) never disagrees with it.
function isWinningBid(auction: PublicAuction, myBidCOP: number): boolean {
  return auction.status === 'published' && auction.currentBidCOP === myBidCOP;
}

function resolveStatus(auction: PublicAuction, myBidCOP: number, currentUserId: string): BidStatus {
  if (auction.status === 'sold') {
    return auction.winnerUserId === currentUserId ? 'Won' : 'Lost';
  }
  return isWinningBid(auction, myBidCOP) ? 'Winning' : 'Outbid';
}

// Auctions still open sort soonest-ending-first (nulls, i.e. not yet bid on
// by anyone, sort last among open ones); anything already sold sorts after
// every open auction — "ending soon" is only meaningful while it's live.
function endingSoonRank(entry: PublicMyBid): number {
  if (entry.auction.status !== 'published') {
    return Infinity;
  }
  return entry.auction.bidEndsAt ? new Date(entry.auction.bidEndsAt).getTime() : Infinity;
}

function sortByEndingSoon(entries: readonly PublicMyBid[]): PublicMyBid[] {
  return [...entries].sort((a, b) => endingSoonRank(a) - endingSoonRank(b));
}

export function MyBidsPage(): React.JSX.Element | null {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [checkingSession, setCheckingSession] = useState(user === null);
  const [myBids, setMyBids] = useState<PublicMyBid[]>([]);
  const auctionUpdates = useGridRealtime();

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
    void fetchMyBids().then(setMyBids);
  }, [user]);

  if (checkingSession || !user) {
    return null;
  }

  // Merge each entry's own live update (if any) before sorting/rendering —
  // a bid placed by someone else while this page is open should move the
  // price, flip Winning to Outbid, and re-rank "ending soon" the same way a
  // reload would, without one.
  const liveBids = myBids.map((entry) => ({
    ...entry,
    auction: withLiveAuctionUpdate(entry.auction, auctionUpdates[entry.auction.id]),
  }));
  const sortedBids = sortByEndingSoon(liveBids);

  return (
    <div className="flex flex-col py-6">
      <h1 className="mb-4 font-display text-3xl font-bold text-ink">My bids</h1>
      {sortedBids.length === 0 ? (
        <p className="text-sm text-ink-soft">No bids yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sortedBids.map((entry) => (
            <AuctionCard
              key={entry.auction.id}
              auction={entry.auction}
              isOwn={false}
              myBidCOP={entry.myBidCOP}
              bidStatus={resolveStatus(entry.auction, entry.myBidCOP, user.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
