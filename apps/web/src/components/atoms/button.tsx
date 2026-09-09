import type { ButtonHTMLAttributes } from 'react';

export type ButtonProps = Readonly<ButtonHTMLAttributes<HTMLButtonElement>>;

export function Button({
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={`w-full rounded-lg bg-brand-500 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-hairline ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
