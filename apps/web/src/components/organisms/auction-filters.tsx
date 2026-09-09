import { COLOMBIA_CITIES, ITEM_CATEGORIES } from '@thrift-loop/shared';
import type { AuctionFilters as AuctionFiltersValue } from '../../lib/api-client.js';
import { Select, type SelectOption } from '../atoms/select.js';
import { TextInput } from '../atoms/text-input.js';
import { SearchableSelect } from '../molecules/searchable-select.js';
import { FormField } from '../molecules/form-field.js';

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

const CATEGORY_OPTIONS: SelectOption[] = ITEM_CATEGORIES.map((value) => ({
  value,
  label: humanize(value),
}));

export interface AuctionFiltersProps {
  readonly value: AuctionFiltersValue;
  readonly onChange: (next: AuctionFiltersValue) => void;
}

export function AuctionFilters({ value, onChange }: AuctionFiltersProps): React.JSX.Element {
  function setField(field: keyof AuctionFiltersValue, next: string): void {
    onChange({ ...value, [field]: next });
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <FormField id="auction-search" label="Search">
        <TextInput
          id="auction-search"
          value={value.search ?? ''}
          placeholder="Search by product name"
          onChange={(next) => setField('search', next)}
        />
      </FormField>

      <FormField id="auction-category" label="Category">
        <Select
          id="auction-category"
          value={value.category ?? ''}
          options={CATEGORY_OPTIONS}
          placeholder="All categories"
          onChange={(next) => setField('category', next)}
        />
      </FormField>

      <FormField id="auction-city" label="City">
        <SearchableSelect
          id="auction-city"
          value={value.city ?? ''}
          options={COLOMBIA_CITIES}
          placeholder="All cities"
          onChange={(next) => setField('city', next)}
        />
      </FormField>

      <FormField id="auction-min-price" label="Min price (COP)">
        <TextInput
          id="auction-min-price"
          type="number"
          value={value.minPriceCOP ?? ''}
          onChange={(next) => setField('minPriceCOP', next)}
        />
      </FormField>

      <FormField id="auction-max-price" label="Max price (COP)">
        <TextInput
          id="auction-max-price"
          type="number"
          value={value.maxPriceCOP ?? ''}
          onChange={(next) => setField('maxPriceCOP', next)}
        />
      </FormField>
    </div>
  );
}
