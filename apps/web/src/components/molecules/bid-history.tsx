import type { PublicBid } from '@thrift-loop/shared';
import { formatCOP } from '../../lib/format.js';

export interface BidHistoryProps {
  readonly bids: readonly PublicBid[];
}

export function BidHistory({ bids }: BidHistoryProps): React.JSX.Element {
  if (bids.length === 0) {
    return <p className="text-sm text-gray-500">No bids yet — be the first.</p>;
  }

  return (
    <ul className="space-y-2">
      {bids.map((bid, index) => (
        <li
          key={bid.id}
          className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm"
        >
          <span className="text-gray-700">
            {bid.bidderFirstName}
            {index === 0 && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Highest
              </span>
            )}
          </span>
          <span className="font-medium text-gray-900">{formatCOP(bid.amountCOP)}</span>
        </li>
      ))}
    </ul>
  );
}
