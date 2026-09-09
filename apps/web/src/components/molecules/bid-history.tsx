import type { PublicBid } from '@thrift-loop/shared';
import { formatCOP } from '../../lib/format.js';

export interface BidHistoryProps {
  readonly bids: readonly PublicBid[];
}

export function BidHistory({ bids }: BidHistoryProps): React.JSX.Element {
  if (bids.length === 0) {
    return <p className="text-sm text-ink-soft">No bids yet — be the first.</p>;
  }

  return (
    <ul className="space-y-2">
      {bids.map((bid, index) => (
        <li
          key={bid.id}
          className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2 text-sm"
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
