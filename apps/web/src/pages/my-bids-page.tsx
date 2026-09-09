import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicMyBid } from '@thrift-loop/shared';
import { fetchCurrentUser, fetchMyBids } from '../lib/api-client.js';
import { formatCOP } from '../lib/format.js';
import { useAuthStore } from '../stores/auth-store.js';
import { Badge } from '../components/atoms/badge.js';

type BidStatus = 'Winning' | 'Outbid' | 'Won' | 'Lost';

function resolveStatus(entry: PublicMyBid, currentUserId: string): BidStatus {
  if (entry.auction.status === 'sold') {
    return entry.auction.winnerUserId === currentUserId ? 'Won' : 'Lost';
  }
  return entry.isWinning ? 'Winning' : 'Outbid';
}

const STATUS_TONE: Record<BidStatus, 'live' | 'ended' | 'draft'> = {
  Winning: 'live',
  Won: 'live',
  Outbid: 'draft',
  Lost: 'ended',
};

function MyBidRow({
  entry,
  currentUserId,
}: {
  readonly entry: PublicMyBid;
  readonly currentUserId: string;
}): React.JSX.Element {
  const status = resolveStatus(entry, currentUserId);
  const currentPrice = entry.auction.currentBidCOP ?? entry.auction.priceCOP;

  return (
    <li className="rounded-lg border border-hairline p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-medium text-ink">{entry.auction.title}</p>
        {/* status is narrowed to the fixed BidStatus union, not attacker input. */}
        {/* eslint-disable-next-line security/detect-object-injection */}
        <Badge tone={STATUS_TONE[status]}>{status}</Badge>
      </div>
      <p className="text-sm text-ink-soft">Your bid: {formatCOP(entry.myBidCOP)}</p>
      <p className="text-sm text-ink-soft">Current price: {formatCOP(currentPrice)}</p>
    </li>
  );
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col py-6">
      <h1 className="mb-4 font-display text-2xl font-bold text-ink">My bids</h1>
      {myBids.length === 0 ? (
        <p className="text-sm text-ink-soft">No bids yet.</p>
      ) : (
        <ul className="space-y-3">
          {myBids.map((entry) => (
            <MyBidRow key={entry.auction.id} entry={entry} currentUserId={user.id} />
          ))}
        </ul>
      )}
    </div>
  );
}
