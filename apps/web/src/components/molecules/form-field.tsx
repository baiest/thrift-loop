import type { ReactNode } from 'react';
import { FieldError } from '../atoms/field-error.js';

export interface FormFieldProps {
  readonly id: string;
  readonly label: string;
  readonly error?: string | undefined;
  readonly children: ReactNode;
}

export function FormField({ id, label, error, children }: FormFieldProps): React.JSX.Element {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
