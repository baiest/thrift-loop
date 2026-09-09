import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicMyBid } from '@thrift-loop/shared';
import { fetchCurrentUser, fetchMyBids } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { AuctionCard, type BidStatus } from '../components/molecules/auction-card.js';

function resolveStatus(entry: PublicMyBid, currentUserId: string): BidStatus {
  if (entry.auction.status === 'sold') {
    return entry.auction.winnerUserId === currentUserId ? 'Won' : 'Lost';
  }
  return entry.isWinning ? 'Winning' : 'Outbid';
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

  const sortedBids = sortByEndingSoon(myBids);

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
              bidStatus={resolveStatus(entry, user.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
