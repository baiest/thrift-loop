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
    // Only report an actual change. This both ignores a keystroke that added
    // no digit (e.g. typing a letter into an empty field) and — the bug this
    // guards against — still clears the value when backspacing the last digit
    // away leaves a non-empty rawValue with no digits in it (the formatted
    // display's currency-symbol/space prefix, e.g. "$ "), which a naive
    // `digits || rawValue === ''` check silently no-ops on.
    if (digits !== value) {
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
