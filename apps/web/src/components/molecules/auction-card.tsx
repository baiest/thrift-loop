import { Link } from 'react-router-dom';
import type { PublicAuction } from '@thrift-loop/shared';
import { formatCOP } from '../../lib/format.js';
import { Badge } from '../atoms/badge.js';

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
      className="flex aspect-square items-center justify-center rounded-lg bg-gray-100"
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

  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="block overflow-hidden rounded-lg border border-gray-200 shadow-sm hover:shadow-md"
    >
      {auction.photoUrls[0] ? (
        <img
          src={auction.photoUrls[0]}
          alt={auction.category}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <PhotoPlaceholder />
      )}
      <div className="p-3">
        <div className="mb-1 flex items-center gap-2">
          <Badge tone="neutral">{humanizeCondition(auction.condition)}</Badge>
          {isOwn && <Badge tone="emerald">Yours</Badge>}
          {auction.status === 'sold' && <Badge tone="amber">Sold</Badge>}
          {auction.status === 'draft' && <Badge tone="amber">Draft</Badge>}
        </div>
        <p className="truncate text-sm font-medium text-gray-900">{auction.title}</p>
        <p className="text-xs text-gray-500">{priceLabel}</p>
        <p className="text-lg font-semibold text-gray-900">{formatCOP(priceValue)}</p>
      </div>
    </Link>
  );
}
