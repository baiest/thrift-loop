import { useEffect, useMemo, useState, type ChangeEvent } from 'react';

const MAX_VISIBLE_OPTIONS = 6;

export interface SearchableSelectProps {
  readonly id: string;
  readonly options: readonly string[];
  readonly value: string;
  readonly placeholder?: string;
  readonly invalid?: boolean;
  readonly onChange: (value: string) => void;
  readonly onBlur?: (() => void) | undefined;
}

export function SearchableSelect({
  id,
  options,
  value,
  placeholder = 'Search...',
  invalid = false,
  onChange,
  onBlur,
}: SearchableSelectProps): React.JSX.Element {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  // Keeps the displayed text in sync when `value` changes from outside
  // (e.g. a default populated after an async fetch), without clobbering
  // what the user is actively typing (typing itself never changes `value`
  // until an option is picked, so this effect only fires on external sets).
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = normalizedQuery
      ? options.filter((option) => option.toLowerCase().includes(normalizedQuery))
      : options;
    return matches.slice(0, MAX_VISIBLE_OPTIONS);
  }, [options, query]);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    setQuery(event.target.value);
    setIsOpen(true);
    if (event.target.value !== value) {
      onChange('');
    }
  }

  function selectOption(option: string): void {
    setQuery(option);
    onChange(option);
    setIsOpen(false);
  }

  function handleBlur(): void {
    setIsOpen(false);
    onBlur?.();
  }

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-invalid={invalid}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        className={`w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 ${
          invalid ? 'border-red-500 focus:ring-red-300' : 'border-hairline focus:ring-brand-300'
        }`}
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-hairline bg-white shadow-lg">
          {filteredOptions.map((option) => (
            <li key={option}>
              <button
                type="button"
                // onMouseDown fires before the input's onBlur, so the click registers.
                onMouseDown={() => selectOption(option)}
                className="block w-full px-4 py-2 text-left hover:bg-brand-50"
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
