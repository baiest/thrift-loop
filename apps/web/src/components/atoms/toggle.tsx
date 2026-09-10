export interface ToggleProps {
  readonly id: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label?: string;
  readonly disabled?: boolean;
}

export function Toggle({
  id,
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleProps): React.JSX.Element {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 appearance-none rounded-[999px] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300 ${
        checked ? 'bg-brand-600' : 'bg-hairline'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-[999px] bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
