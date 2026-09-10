import type { ChangeEvent, FocusEvent } from 'react';

const TEXTAREA_ROWS = 4;

export interface TextareaProps {
  readonly id: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly invalid?: boolean;
  readonly maxLength?: number;
  readonly onChange: (value: string) => void;
  readonly onBlur?: (() => void) | undefined;
}

export function Textarea({
  id,
  value,
  placeholder,
  invalid = false,
  maxLength,
  onChange,
  onBlur,
}: TextareaProps): React.JSX.Element {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    onChange(event.target.value);
  };
  const handleBlur = (_event: FocusEvent<HTMLTextAreaElement>): void => {
    onBlur?.();
  };

  return (
    <div>
      <textarea
        id={id}
        rows={TEXTAREA_ROWS}
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 ${
          invalid ? 'border-red-500 focus:ring-red-300' : 'border-hairline focus:ring-brand-300'
        }`}
      />
      {maxLength !== undefined && (
        <p className="mt-1 text-right text-xs text-ink-soft">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
