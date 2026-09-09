import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  COLOMBIA_CITIES,
  DELIVERY_METHODS,
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  isColombiaCity,
  isDeliveryMethod,
  isItemCategory,
  isItemCondition,
  isValidCopPrice,
  isValidDescription,
  isValidTitle,
} from '@thrift-loop/shared';
import {
  ApiError,
  createAuction,
  fetchCurrentUser,
  uploadAuctionPhotos,
  type CreateAuctionPayload,
} from '../../lib/api-client.js';
import { Select, type SelectOption } from '../atoms/select.js';
import { TextInput } from '../atoms/text-input.js';
import { Textarea } from '../atoms/textarea.js';
import { Button } from '../atoms/button.js';
import { FormField } from '../molecules/form-field.js';
import { PhotoUploader } from '../molecules/photo-uploader.js';
import { SearchableSelect } from '../molecules/searchable-select.js';

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
  title: '',
  description: '',
  category: '',
  condition: '',
  deliveryMethod: '',
  priceCOP: '',
  publishAt: '',
  location: '',
};

function validateTitle(values: FormValues): string | undefined {
  return isValidTitle(values.title)
    ? undefined
    : `Enter a title up to ${MAX_TITLE_LENGTH} characters, letters and numbers only`;
}

function validateDescription(values: FormValues): string | undefined {
  return isValidDescription(values.description)
    ? undefined
    : `Enter a description up to ${MAX_DESCRIPTION_LENGTH} characters`;
}

function validateLocation(values: FormValues): string | undefined {
  return isColombiaCity(values.location) ? undefined : 'Select a valid location';
}

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
  title: validateTitle,
  description: validateDescription,
  category: validateCategory,
  condition: validateCondition,
  deliveryMethod: validateDeliveryMethod,
  priceCOP: validatePrice,
  location: validateLocation,
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
  const locationTouched = useRef(false);

  useEffect(() => {
    let isActive = true;
    void fetchCurrentUser().then((user) => {
      if (isActive && user?.city && !locationTouched.current) {
        setValues((current) => ({ ...current, location: user.city }));
      }
    });
    return () => {
      isActive = false;
    };
  }, []);

  function updateField(field: keyof FormValues, value: string): void {
    if (field === 'location') {
      locationTouched.current = true;
    }
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
      <FormField id="title" label="Title" error={errors.title}>
        <TextInput
          id="title"
          value={values.title}
          invalid={Boolean(errors.title)}
          onChange={(value) => updateField('title', value)}
        />
        <p className="mt-1 text-xs text-gray-500">
          {values.title.length}/{MAX_TITLE_LENGTH} characters
        </p>
      </FormField>

      <FormField id="description" label="Description" error={errors.description}>
        <Textarea
          id="description"
          value={values.description}
          invalid={Boolean(errors.description)}
          onChange={(value) => updateField('description', value)}
        />
        <p className="mt-1 text-xs text-gray-500">
          {values.description.length}/{MAX_DESCRIPTION_LENGTH} characters
        </p>
      </FormField>

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

      <FormField id="location" label="Location" error={errors.location}>
        <SearchableSelect
          id="location"
          options={COLOMBIA_CITIES}
          value={values.location}
          placeholder="Search a city"
          invalid={Boolean(errors.location)}
          onChange={(value) => updateField('location', value)}
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
