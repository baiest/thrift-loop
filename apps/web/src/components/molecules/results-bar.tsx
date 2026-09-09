import type { AuctionSort } from '@thrift-loop/shared';
import { SortControl } from './sort-control.js';

export interface ResultsBarProps {
  readonly count: number;
  readonly sort: AuctionSort;
  readonly onSortChange: (next: AuctionSort) => void;
}

export function ResultsBar({ count, sort, onSortChange }: ResultsBarProps): React.JSX.Element {
  const noun = count === 1 ? 'item' : 'items';
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-ink-soft">
        {count} {noun} available to bid
      </p>
      <SortControl value={sort} onChange={onSortChange} />
    </div>
  );
}
