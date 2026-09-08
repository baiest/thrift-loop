import { useState, type FormEvent } from 'react';
import {
  DELIVERY_METHODS,
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  isDeliveryMethod,
  isItemCategory,
  isItemCondition,
  isValidCopPrice,
} from '@thrift-loop/shared';
import {
  ApiError,
  createAuction,
  uploadAuctionPhotos,
  type CreateAuctionPayload,
} from '../../lib/api-client.js';
import { Select, type SelectOption } from '../atoms/select.js';
import { TextInput } from '../atoms/text-input.js';
import { Button } from '../atoms/button.js';
import { FormField } from '../molecules/form-field.js';
import { PhotoUploader } from '../molecules/photo-uploader.js';

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

function toOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: humanize(value) }));
}

const CATEGORY_OPTIONS = toOptions(ITEM_CATEGORIES);
const CONDITION_OPTIONS = toOptions(ITEM_CONDITIONS);
const DELIVERY_METHOD_OPTIONS = toOptions(DELIVERY_METHODS);

type FormValues = CreateAuctionPayload;
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_VALUES: FormValues = {
  category: '',
  condition: '',
  deliveryMethod: '',
  priceCOP: '',
  publishAt: '',
};

function validateCategory(values: FormValues): string | undefined {
  return isItemCategory(values.category) ? undefined : 'Select a category';
}

function validateCondition(values: FormValues): string | undefined {
  return isItemCondition(values.condition) ? undefined : 'Select a condition';
}

function validateDeliveryMethod(values: FormValues): string | undefined {
  return isDeliveryMethod(values.deliveryMethod) ? undefined : 'Select a delivery method';
}

function validatePrice(values: FormValues): string | undefined {
  const parsed = Number(values.priceCOP);
  return Number.isInteger(parsed) && isValidCopPrice(parsed)
    ? undefined
    : 'Enter a whole number price in Colombian pesos';
}

const REQUIRED_FIELD_VALIDATORS: Record<
  Exclude<keyof FormValues, 'publishAt'>,
  (values: FormValues) => string | undefined
> = {
  category: validateCategory,
  condition: validateCondition,
  deliveryMethod: validateDeliveryMethod,
  priceCOP: validatePrice,
};

function validateAll(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  for (const field of Object.keys(
    REQUIRED_FIELD_VALIDATORS,
  ) as (keyof typeof REQUIRED_FIELD_VALIDATORS)[]) {
    // field always comes from this file's own fixed validator map, not request data.
    // eslint-disable-next-line security/detect-object-injection
    const error = REQUIRED_FIELD_VALIDATORS[field](values);
    if (error) {
      // eslint-disable-next-line security/detect-object-injection
      errors[field] = error;
    }
  }
  return errors;
}

export interface CreateAuctionFormProps {
  readonly onSuccess?: (() => void) | undefined;
}

export function CreateAuctionForm({ onSuccess }: CreateAuctionFormProps): React.JSX.Element {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [serverError, setServerError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof FormValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
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
      const auction = await createAuction(values);
      if (photos.length > 0) {
        await uploadAuctionPhotos(auction.id, photos);
      }
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
      <FormField id="category" label="Category" error={errors.category}>
        <Select
          id="category"
          options={CATEGORY_OPTIONS}
          value={values.category}
          invalid={Boolean(errors.category)}
          onChange={(value) => updateField('category', value)}
        />
      </FormField>

      <FormField id="condition" label="Condition" error={errors.condition}>
        <Select
          id="condition"
          options={CONDITION_OPTIONS}
          value={values.condition}
          invalid={Boolean(errors.condition)}
          onChange={(value) => updateField('condition', value)}
        />
      </FormField>

      <FormField id="deliveryMethod" label="Delivery method" error={errors.deliveryMethod}>
        <Select
          id="deliveryMethod"
          options={DELIVERY_METHOD_OPTIONS}
          value={values.deliveryMethod}
          invalid={Boolean(errors.deliveryMethod)}
          onChange={(value) => updateField('deliveryMethod', value)}
        />
      </FormField>

      <FormField id="priceCOP" label="Price (COP)" error={errors.priceCOP}>
        <TextInput
          id="priceCOP"
          type="number"
          value={values.priceCOP}
          invalid={Boolean(errors.priceCOP)}
          onChange={(value) => updateField('priceCOP', value)}
        />
      </FormField>

      <FormField id="publishAt" label="Publish date (optional)" error={errors.publishAt}>
        <TextInput
          id="publishAt"
          type="datetime-local"
          value={values.publishAt}
          onChange={(value) => updateField('publishAt', value)}
        />
      </FormField>

      <div className="mb-4">
        <PhotoUploader files={photos} onChange={setPhotos} />
      </div>

      {serverError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Creating auction...' : 'Create auction'}
      </Button>
    </form>
  );
}
