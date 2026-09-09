import type { ChangeEvent } from 'react';
import { formatCOP } from '../../lib/format.js';

const DIGITS_ONLY = /\D/g;

function displayValue(rawDigits: string): string {
  return rawDigits ? formatCOP(Number(rawDigits)) : '';
}

export interface CurrencyInputProps {
  readonly id: string;
  readonly value: string;
  readonly invalid?: boolean;
  readonly label?: string;
  readonly onChange: (rawDigits: string) => void;
}

export function CurrencyInput({
  id,
  value,
  invalid = false,
  label = 'Price',
  onChange,
}: CurrencyInputProps): React.JSX.Element {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const digits = event.target.value.replace(DIGITS_ONLY, '');
    if (digits) {
      onChange(digits);
    }
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue(value)}
        aria-invalid={invalid}
        onChange={handleChange}
        className={`w-full rounded-lg border px-4 py-3 font-display text-2xl focus:outline-none focus:ring-2 ${
          invalid ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-300'
        }`}
      />
    </div>
  );
}
