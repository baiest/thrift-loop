import type { AuctionFilters } from '../../lib/api-client.js';
import { Icon } from '../atoms/icon.js';
import { formatCOP } from '../../lib/format.js';

const CHIP_FIELDS = ['category', 'city', 'minPriceCOP', 'maxPriceCOP'] as const;

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

function chipLabel(field: (typeof CHIP_FIELDS)[number], value: string): string {
  if (field === 'category') {
    return humanize(value);
  }
  if (field === 'city') {
    return value;
  }
  if (field === 'minPriceCOP') {
    return `Over ${formatCOP(Number(value))}`;
  }
  return `Under ${formatCOP(Number(value))}`;
}

export interface FilterChipsProps {
  readonly value: AuctionFilters;
  readonly onChange: (next: AuctionFilters) => void;
}

export function FilterChips({ value, onChange }: FilterChipsProps): React.JSX.Element {
  // field always comes from the fixed CHIP_FIELDS tuple above, not request data.
  // eslint-disable-next-line security/detect-object-injection
  const activeFields = CHIP_FIELDS.filter((field) => value[field]);

  if (activeFields.length === 0) {
    return <></>;
  }

  function clearField(field: (typeof CHIP_FIELDS)[number]): void {
    onChange({ ...value, [field]: '' });
  }

  function clearAll(): void {
    const cleared = { ...value };
    for (const field of activeFields) {
      // eslint-disable-next-line security/detect-object-injection
      cleared[field] = '';
    }
    onChange(cleared);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {activeFields.map((field) => {
        // field is narrowed to the fixed CHIP_FIELDS tuple, not request data.
        // eslint-disable-next-line security/detect-object-injection
        const label = chipLabel(field, value[field] ?? '');
        return (
          <span
            key={field}
            className="flex items-center gap-1 rounded-full border border-hairline bg-white px-3 py-1 text-xs font-medium text-ink"
          >
            {label}
            <button
              type="button"
              aria-label={`Remove ${label} filter`}
              onClick={() => clearField(field)}
            >
              <Icon name="x" className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs font-medium text-gray-500 underline hover:text-brand-700"
      >
        Clear all
      </button>
    </div>
  );
}
