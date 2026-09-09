import type { ChangeEvent, FocusEvent } from 'react';

const TEXTAREA_ROWS = 4;

export interface TextareaProps {
  readonly id: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly invalid?: boolean;
  readonly onChange: (value: string) => void;
  readonly onBlur?: (() => void) | undefined;
}

export function Textarea({
  id,
  value,
  placeholder,
  invalid = false,
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
    <textarea
      id={id}
      rows={TEXTAREA_ROWS}
      value={value}
      placeholder={placeholder}
      aria-invalid={invalid}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 ${
        invalid ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-300'
      }`}
    />
  );
}
