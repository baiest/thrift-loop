import type { ChangeEvent } from 'react';
import { Icon } from '../atoms/icon.js';

const PLACEHOLDER = 'Search jackets, denim, sneakers...';

export interface SearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function SearchField({ value, onChange }: SearchFieldProps): React.JSX.Element {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onChange(event.target.value);
  }

  return (
    <div className="relative flex-1">
      <Icon
        name="search"
        className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-ink-faint"
      />
      <input
        role="searchbox"
        type="search"
        value={value}
        placeholder={PLACEHOLDER}
        onChange={handleChange}
        className="h-14 w-full rounded-xl border border-hairline bg-white pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
    </div>
  );
}
