import type { PublicBid } from '@thrift-loop/shared';
import { formatCOP } from '../../lib/format.js';
import { useFlashOnChange } from '../../hooks/use-flash-on-change.js';

export interface BidHistoryProps {
  readonly bids: readonly PublicBid[];
}

export function BidHistory({ bids }: BidHistoryProps): React.JSX.Element {
  // A new bid re-sorts to the top — animate that row in so a live update
  // (which can otherwise slip by unnoticed) draws the eye. Keyed on the id,
  // not the amount: a genuinely new top bid always has a new id.
  const topBidEntering = useFlashOnChange(bids[0]?.id ?? null);

  if (bids.length === 0) {
    return <p className="text-sm text-ink-soft">No bids yet — be the first.</p>;
  }

  return (
    <ul className="space-y-2">
      {bids.map((bid, index) => (
        <li
          key={bid.id}
          className={`flex items-center justify-between rounded-lg border border-hairline px-3 py-2 text-sm ${
            index === 0 && topBidEntering ? 'animate-bid-row-enter' : ''
          }`}
        >
          <span className="text-ink-soft">
            {bid.bidderFirstName}
            {index === 0 && (
              <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                Highest
              </span>
            )}
          </span>
          <span className="font-medium text-ink">{formatCOP(bid.amountCOP)}</span>
        </li>
      ))}
    </ul>
  );
}
