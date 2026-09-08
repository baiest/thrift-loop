import type { ChangeEvent } from 'react';

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
    <select
      id={id}
      value={value}
      aria-invalid={invalid}
      onChange={handleChange}
      onBlur={onBlur}
      className={`w-full rounded-lg border bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 ${
        invalid ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-emerald-300'
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
  );
}
