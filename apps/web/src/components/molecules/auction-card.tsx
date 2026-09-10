import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicAuction } from '@thrift-loop/shared';
import { formatCOP, formatTimeLeft } from '../../lib/format.js';
import { useNow } from '../../hooks/use-now.js';
import { useFlashOnChange } from '../../hooks/use-flash-on-change.js';
import { Badge } from '../atoms/badge.js';
import { PhotoPlaceholder } from '../atoms/photo-placeholder.js';

const START_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export type BidStatus = 'Winning' | 'Outbid' | 'Won' | 'Lost';

export interface AuctionCardProps {
  readonly auction: PublicAuction;
  readonly isOwn: boolean;
  readonly myBidCOP?: number | undefined;
  readonly bidStatus?: BidStatus | undefined;
}

const BID_STATUS_TONE: Record<BidStatus, 'live' | 'ended' | 'draft'> = {
  Winning: 'live',
  Won: 'live',
  Outbid: 'draft',
  Lost: 'ended',
};

function humanizeCondition(condition: string): string {
  return condition.charAt(0).toUpperCase() + condition.slice(1).replace(/-/g, ' ');
}

function StatusBadges({
  auction,
  isOwn,
  bidStatus,
}: {
  readonly auction: PublicAuction;
  readonly isOwn: boolean;
  readonly bidStatus: BidStatus | undefined;
}): React.JSX.Element {
  return (
    <div className="mb-1 flex flex-wrap items-center gap-2">
      <Badge tone="condition">{humanizeCondition(auction.condition)}</Badge>
      {isOwn && <Badge tone="own">Yours</Badge>}
      {bidStatus ? (
        // bidStatus is narrowed to the fixed BidStatus union, not attacker input.
        // eslint-disable-next-line security/detect-object-injection
        <Badge tone={BID_STATUS_TONE[bidStatus]}>{bidStatus}</Badge>
      ) : (
        auction.status === 'sold' && <Badge tone="ended">Sold</Badge>
      )}
      {auction.status === 'draft' && <Badge tone="draft">Draft</Badge>}
    </div>
  );
}

export function AuctionCard({
  auction,
  isOwn,
  myBidCOP,
  bidStatus,
}: AuctionCardProps): React.JSX.Element {
  const priceLabel = auction.currentBidCOP === null ? 'Starting at' : 'Current bid';
  const priceValue = auction.currentBidCOP ?? auction.priceCOP;
  // The grid receives the same live price pushes as the detail page (via
  // AuctionGrid's withLiveUpdate) — flash here too so a bid on a card you're
  // browsing past doesn't just silently jump.
  const priceFlash = useFlashOnChange(priceValue);
  const now = useNow();
  const timeLeft = formatTimeLeft(auction.bidEndsAt, now);
  const startedOn = START_DATE_FORMATTER.format(new Date(auction.createdAt));
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="block overflow-hidden rounded-lg border border-hairline bg-white shadow-sm hover:shadow-md"
    >
      {auction.photoUrls[0] && !photoFailed ? (
        <img
          src={auction.photoUrls[0]}
          alt={auction.category}
          onError={() => setPhotoFailed(true)}
          className="aspect-[4/5] w-full object-cover"
        />
      ) : (
        <PhotoPlaceholder className="aspect-[4/5]" />
      )}
      <div className="p-3">
        <StatusBadges auction={auction} isOwn={isOwn} bidStatus={bidStatus} />
        <p className="truncate text-sm font-medium text-ink">{auction.title}</p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-ink-soft">{priceLabel}</p>
            <p
              className={`inline-block rounded-md font-display text-lg font-semibold text-ink ${priceFlash ? 'animate-flash-highlight' : ''}`}
            >
              {formatCOP(priceValue)}
            </p>
          </div>
          <p
            className={`text-xs font-medium ${timeLeft.isUrgent ? 'text-brand-600' : 'text-ink-soft'}`}
          >
            {timeLeft.label}
          </p>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Started {startedOn} · {auction.location}
        </p>
        {myBidCOP !== undefined && (
          <p className="mt-1 text-xs font-medium text-brand-600">You bid {formatCOP(myBidCOP)}</p>
        )}
      </div>
    </Link>
  );
}
