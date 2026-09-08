export interface FieldErrorProps {
  readonly message?: string | undefined;
}

export function FieldError({ message }: FieldErrorProps): React.JSX.Element | null {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className="mt-1 text-sm text-red-600">
      {message}
    </p>
  );
}
