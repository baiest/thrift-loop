import { useState } from 'react';
import { TextInput } from './text-input.js';

export interface PasswordInputProps {
  readonly id: string;
  readonly value: string;
  readonly autoComplete?: string;
  readonly invalid?: boolean;
  readonly onChange: (value: string) => void;
  readonly onBlur?: (() => void) | undefined;
}

function EyeIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A11.6 11.6 0 0 1 12 5c7 0 11 7 11 7a17.4 17.4 0 0 1-3.6 4.4M6.6 6.6A17.7 17.7 0 0 0 1 12s4 7 11 7a10.5 10.5 0 0 0 5.3-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function PasswordInput({
  id,
  value,
  autoComplete = 'new-password',
  invalid = false,
  onChange,
  onBlur,
}: PasswordInputProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <TextInput
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        invalid={invalid}
        onChange={onChange}
        onBlur={onBlur}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-3 flex items-center text-gray-500"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
