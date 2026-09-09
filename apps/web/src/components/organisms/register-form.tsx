import { useState, type FormEvent } from 'react';
import {
  COLOMBIA_CITIES,
  ITEM_CATEGORIES,
  isColombiaCity,
  isColombianMobilePhone,
  validatePassword,
  type PasswordRule,
} from '@thrift-loop/shared';
import { ApiError, register, type RegisterPayload } from '../../lib/api-client.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { TextInput } from '../atoms/text-input.js';
import { PasswordInput } from '../atoms/password-input.js';
import { Select, type SelectOption } from '../atoms/select.js';
import { Button } from '../atoms/button.js';
import { FormField } from '../molecules/form-field.js';
import { SearchableSelect } from '../molecules/searchable-select.js';
import { PasswordStrengthMeter } from '../molecules/password-strength-meter.js';

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

const CATEGORY_PREFERENCE_OPTIONS: SelectOption[] = ITEM_CATEGORIES.map((value) => ({
  value,
  label: humanize(value),
}));

const PASSWORD_RULE_MESSAGES: Record<PasswordRule, string> = {
  minLength: 'Password must be at least 8 characters',
  uppercase: 'Password must include an uppercase letter',
  lowercase: 'Password must include a lowercase letter',
  digit: 'Password must include a digit',
};

type FormValues = RegisterPayload;
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_VALUES: FormValues = {
  phone: '',
  firstName: '',
  lastName: '',
  city: '',
  password: '',
  confirmPassword: '',
  categoryPreference: '',
};

function validatePhoneField(values: FormValues): string | undefined {
  return isColombianMobilePhone(values.phone)
    ? undefined
    : 'Enter a valid Colombian mobile number (10 digits, starts with 3)';
}

function validateFirstNameField(values: FormValues): string | undefined {
  return values.firstName.trim().length === 0 ? 'First name is required' : undefined;
}

function validateLastNameField(values: FormValues): string | undefined {
  return values.lastName.trim().length === 0 ? 'Last name is required' : undefined;
}

function validateCityField(values: FormValues): string | undefined {
  return isColombiaCity(values.city) ? undefined : 'Select a valid city';
}

function validatePasswordField(values: FormValues): string | undefined {
  const firstViolation = validatePassword(values.password)[0];
  // firstViolation is a PasswordRule from the shared validator's closed union.
  // eslint-disable-next-line security/detect-object-injection
  return firstViolation ? PASSWORD_RULE_MESSAGES[firstViolation] : undefined;
}

function validateConfirmPasswordField(values: FormValues): string | undefined {
  return values.password !== values.confirmPassword ? 'Passwords do not match' : undefined;
}

function validateCategoryPreferenceField(): string | undefined {
  return undefined;
}

const FIELD_VALIDATORS: Record<keyof FormValues, (values: FormValues) => string | undefined> = {
  phone: validatePhoneField,
  firstName: validateFirstNameField,
  lastName: validateLastNameField,
  city: validateCityField,
  password: validatePasswordField,
  confirmPassword: validateConfirmPasswordField,
  categoryPreference: validateCategoryPreferenceField,
};

function validateField(field: keyof FormValues, values: FormValues): string | undefined {
  // field is always a key of FormValues, the object this map is built from.
  // eslint-disable-next-line security/detect-object-injection
  return FIELD_VALIDATORS[field](values);
}

function validateAll(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  (Object.keys(values) as (keyof FormValues)[]).forEach((field) => {
    const error = validateField(field, values);
    if (error) {
      // field is always a key of FormValues, the object being iterated.
      // eslint-disable-next-line security/detect-object-injection
      errors[field] = error;
    }
  });
  return errors;
}

export interface RegisterFormProps {
  readonly onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps): React.JSX.Element {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  function updateField(field: keyof FormValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleBlur(field: keyof FormValues): void {
    setErrors((current) => ({ ...current, [field]: validateField(field, values) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setServerError(undefined);

    const validationErrors = validateAll(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const user = await register(values);
      setUser(user);
      onSuccess?.();
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        setErrors(error.fields);
      } else if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate>
      <FormField id="phone" label="Phone number" error={errors.phone}>
        <TextInput
          id="phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          invalid={Boolean(errors.phone)}
          onChange={(value) => updateField('phone', value)}
          onBlur={() => handleBlur('phone')}
        />
      </FormField>

      <FormField id="firstName" label="First name" error={errors.firstName}>
        <TextInput
          id="firstName"
          autoComplete="given-name"
          value={values.firstName}
          invalid={Boolean(errors.firstName)}
          onChange={(value) => updateField('firstName', value)}
          onBlur={() => handleBlur('firstName')}
        />
      </FormField>

      <FormField id="lastName" label="Last name" error={errors.lastName}>
        <TextInput
          id="lastName"
          autoComplete="family-name"
          value={values.lastName}
          invalid={Boolean(errors.lastName)}
          onChange={(value) => updateField('lastName', value)}
          onBlur={() => handleBlur('lastName')}
        />
      </FormField>

      <FormField id="city" label="City" error={errors.city}>
        <SearchableSelect
          id="city"
          options={COLOMBIA_CITIES}
          value={values.city}
          placeholder="Search your city"
          invalid={Boolean(errors.city)}
          onChange={(value) => updateField('city', value)}
          onBlur={() => handleBlur('city')}
        />
      </FormField>

      <FormField
        id="categoryPreference"
        label="Category preference"
        error={errors.categoryPreference}
      >
        <Select
          id="categoryPreference"
          options={CATEGORY_PREFERENCE_OPTIONS}
          value={values.categoryPreference}
          placeholder="No preference"
          onChange={(value) => updateField('categoryPreference', value)}
        />
      </FormField>

      <FormField id="password" label="Password" error={errors.password}>
        <PasswordInput
          id="password"
          value={values.password}
          invalid={Boolean(errors.password)}
          onChange={(value) => updateField('password', value)}
          onBlur={() => handleBlur('password')}
        />
        <PasswordStrengthMeter password={values.password} />
      </FormField>

      <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
        <PasswordInput
          id="confirmPassword"
          value={values.confirmPassword}
          invalid={Boolean(errors.confirmPassword)}
          onChange={(value) => updateField('confirmPassword', value)}
          onBlur={() => handleBlur('confirmPassword')}
        />
      </FormField>

      {serverError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}
