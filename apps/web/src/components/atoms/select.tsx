import type { ChangeEvent } from 'react';
import { Icon } from './icon.js';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectProps {
  readonly id: string;
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly placeholder?: string;
  readonly invalid?: boolean;
  readonly onChange: (value: string) => void;
  readonly onBlur?: (() => void) | undefined;
}

export function Select({
  id,
  value,
  options,
  placeholder = 'Select...',
  invalid = false,
  onChange,
  onBlur,
}: SelectProps): React.JSX.Element {
  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    onChange(event.target.value);
  }

  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        aria-invalid={invalid}
        onChange={handleChange}
        onBlur={onBlur}
        className={`w-full appearance-none rounded-lg border bg-white px-4 py-3 pr-10 text-base focus:outline-none focus:ring-2 ${
          invalid ? 'border-red-500 focus:ring-red-300' : 'border-hairline focus:ring-brand-300'
        }`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
      />
    </div>
  );
}
