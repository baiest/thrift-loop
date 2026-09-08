import { useState, type FormEvent } from 'react';
import { ApiError, login, type LoginPayload } from '../../lib/api-client.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { TextInput } from '../atoms/text-input.js';
import { PasswordInput } from '../atoms/password-input.js';
import { Button } from '../atoms/button.js';
import { FormField } from '../molecules/form-field.js';

const EMPTY_VALUES: LoginPayload = { phone: '', password: '' };

export interface LoginFormProps {
  readonly onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps): React.JSX.Element {
  const [values, setValues] = useState<LoginPayload>(EMPTY_VALUES);
  const [serverError, setServerError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  function updateField(field: keyof LoginPayload, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setServerError(undefined);

    if (!values.phone || !values.password) {
      setServerError('Enter your phone number and password');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(values);
      setUser(user);
      onSuccess?.();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate>
      <FormField id="phone" label="Phone number">
        <TextInput
          id="phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(value) => updateField('phone', value)}
        />
      </FormField>

      <FormField id="password" label="Password">
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(value) => updateField('password', value)}
        />
      </FormField>

      {serverError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Logging in...' : 'Log in'}
      </Button>
    </form>
  );
}
