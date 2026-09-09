import { AUCTION_SORTS, type AuctionSort } from '@thrift-loop/shared';
import { Select, type SelectOption } from '../atoms/select.js';

const SORT_ID = 'auction-sort';

const SORT_LABELS: Record<AuctionSort, string> = {
  'ending-soon': 'Ending soon',
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
};

const SORT_OPTIONS: SelectOption[] = AUCTION_SORTS.map((value) => ({
  value,
  // value is narrowed to AuctionSort by AUCTION_SORTS, not attacker input.
  // eslint-disable-next-line security/detect-object-injection
  label: SORT_LABELS[value],
}));

export interface SortControlProps {
  readonly value: AuctionSort;
  readonly onChange: (next: AuctionSort) => void;
}

export function SortControl({ value, onChange }: SortControlProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={SORT_ID} className="whitespace-nowrap text-sm font-medium text-ink">
        Sort:
      </label>
      <Select
        id={SORT_ID}
        value={value}
        options={SORT_OPTIONS}
        onChange={(next) => onChange(next as AuctionSort)}
      />
    </div>
  );
}
