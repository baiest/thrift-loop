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
  readonly onChange: (rawDigits: string) => void;
}

export function CurrencyInput({
  id,
  value,
  invalid = false,
  onChange,
}: CurrencyInputProps): React.JSX.Element {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const digits = event.target.value.replace(DIGITS_ONLY, '');
    if (digits) {
      onChange(digits);
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue(value)}
      aria-invalid={invalid}
      onChange={handleChange}
      className={`w-full rounded-lg border px-4 py-3 font-display text-2xl focus:outline-none focus:ring-2 ${
        invalid ? 'border-red-500 focus:ring-red-300' : 'border-hairline focus:ring-brand-300'
      }`}
    />
  );
}
