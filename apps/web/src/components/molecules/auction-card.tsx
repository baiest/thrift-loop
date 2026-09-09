import { Link } from 'react-router-dom';
import type { PublicAuction } from '@thrift-loop/shared';
import { formatCOP, formatTimeLeft } from '../../lib/format.js';
import { useNow } from '../../hooks/use-now.js';
import { Badge } from '../atoms/badge.js';

const START_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export interface AuctionCardProps {
  readonly auction: PublicAuction;
  readonly isOwn: boolean;
}

function humanizeCondition(condition: string): string {
  return condition.charAt(0).toUpperCase() + condition.slice(1).replace(/-/g, ' ');
}

function PhotoPlaceholder(): React.JSX.Element {
  return (
    <div
      aria-label="No photo"
      className="flex aspect-[4/5] items-center justify-center rounded-lg bg-gray-100"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="h-8 w-8 text-gray-400"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </div>
  );
}

export function AuctionCard({ auction, isOwn }: AuctionCardProps): React.JSX.Element {
  const priceLabel = auction.currentBidCOP === null ? 'Starting at' : 'Current bid';
  const priceValue = auction.currentBidCOP ?? auction.priceCOP;
  const now = useNow();
  const timeLeft = formatTimeLeft(auction.bidEndsAt, now);
  const startedOn = START_DATE_FORMATTER.format(new Date(auction.createdAt));

  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="block overflow-hidden rounded-lg border border-hairline bg-white shadow-sm hover:shadow-md"
    >
      {auction.photoUrls[0] ? (
        <img
          src={auction.photoUrls[0]}
          alt={auction.category}
          className="aspect-[4/5] w-full object-cover"
        />
      ) : (
        <PhotoPlaceholder />
      )}
      <div className="p-3">
        <div className="mb-1 flex items-center gap-2">
          <Badge tone="condition">{humanizeCondition(auction.condition)}</Badge>
          {isOwn && <Badge tone="own">Yours</Badge>}
          {auction.status === 'sold' && <Badge tone="ended">Sold</Badge>}
          {auction.status === 'draft' && <Badge tone="draft">Draft</Badge>}
        </div>
        <p className="truncate text-sm font-medium text-gray-900">{auction.title}</p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">{priceLabel}</p>
            <p className="font-display text-lg font-semibold text-ink">{formatCOP(priceValue)}</p>
          </div>
          <p
            className={`text-xs font-medium ${timeLeft.isUrgent ? 'text-brand-600' : 'text-gray-500'}`}
          >
            {timeLeft.label}
          </p>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          Started {startedOn} · {auction.location}
        </p>
      </div>
    </Link>
  );
}
