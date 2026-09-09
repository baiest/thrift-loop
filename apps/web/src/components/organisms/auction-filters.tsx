import type { AuctionFilters as AuctionFiltersValue } from '../../lib/api-client.js';
import { SearchField } from '../molecules/search-field.js';
import { FilterPanel } from '../molecules/filter-panel.js';
import { FilterChips } from '../molecules/filter-chips.js';

export interface AuctionFiltersProps {
  readonly value: AuctionFiltersValue;
  readonly onChange: (next: AuctionFiltersValue) => void;
}

export function AuctionFilters({ value, onChange }: AuctionFiltersProps): React.JSX.Element {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <SearchField
          value={value.search ?? ''}
          onChange={(next) => onChange({ ...value, search: next })}
        />
        <FilterPanel value={value} onChange={onChange} />
      </div>
      <FilterChips value={value} onChange={onChange} />
    </div>
  );
}
