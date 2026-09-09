import type { ChangeEvent, FocusEvent } from 'react';

export interface TextInputProps {
  readonly id: string;
  readonly type?: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly autoComplete?: string;
  readonly invalid?: boolean;
  readonly onChange: (value: string) => void;
  readonly onBlur?: (() => void) | undefined;
}

export function TextInput({
  id,
  type = 'text',
  value,
  placeholder,
  autoComplete,
  invalid = false,
  onChange,
  onBlur,
}: TextInputProps): React.JSX.Element {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.target.value);
  };
  const handleBlur = (_event: FocusEvent<HTMLInputElement>): void => {
    onBlur?.();
  };

  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-invalid={invalid}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 ${
        invalid ? 'border-red-500 focus:ring-red-300' : 'border-hairline focus:ring-brand-300'
      }`}
    />
  );
}
