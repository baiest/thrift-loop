import { useState } from 'react';
import { COLOMBIA_CITIES, ITEM_CATEGORIES } from '@thrift-loop/shared';
import type { AuctionFilters } from '../../lib/api-client.js';
import { Select, type SelectOption } from '../atoms/select.js';
import { TextInput } from '../atoms/text-input.js';
import { Icon } from '../atoms/icon.js';
import { SearchableSelect } from './searchable-select.js';
import { FormField } from './form-field.js';

const COUNTED_FIELDS = ['category', 'city', 'minPriceCOP', 'maxPriceCOP'] as const;

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

const CATEGORY_OPTIONS: SelectOption[] = ITEM_CATEGORIES.map((value) => ({
  value,
  label: humanize(value),
}));

export interface FilterPanelProps {
  readonly value: AuctionFilters;
  readonly onChange: (next: AuctionFilters) => void;
}

export function FilterPanel({ value, onChange }: FilterPanelProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  // field always comes from the fixed COUNTED_FIELDS tuple above, not request data.
  // eslint-disable-next-line security/detect-object-injection
  const activeCount = COUNTED_FIELDS.filter((field) => value[field]).length;

  function setField(field: keyof AuctionFilters, next: string): void {
    onChange({ ...value, [field]: next });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex h-14 items-center gap-2 rounded-xl border border-hairline bg-white px-5 font-medium text-ink"
      >
        <Icon name="sliders" className="h-5 w-5" />
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      )}
    </div>
  );
}
