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
import { PhotoDropzone } from '../molecules/photo-dropzone.js';
import { SearchableSelect } from '../molecules/searchable-select.js';
import { Stepper } from '../molecules/stepper.js';
import { CurrencyInput } from '../molecules/currency-input.js';
import { DateTimePicker } from '../molecules/date-time-picker.js';
import { formatCOP } from '../../lib/format.js';

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

const FIELD_VALIDATORS: Record<
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

type ValidatedField = keyof typeof FIELD_VALIDATORS;

interface WizardStep {
  readonly id: string;
  readonly label: string;
  readonly fields: readonly ValidatedField[];
}

const WIZARD_STEPS: readonly WizardStep[] = [
  { id: 'photos', label: 'Photos', fields: [] },
  {
    id: 'details',
    label: 'Details',
    fields: ['title', 'description', 'category', 'condition', 'deliveryMethod', 'location'],
  },
  { id: 'pricing', label: 'Pricing', fields: ['priceCOP'] },
  { id: 'schedule', label: 'Schedule', fields: [] },
  { id: 'review', label: 'Review', fields: [] },
];

const STEP_LABELS = WIZARD_STEPS.map((step) => step.label);
const LAST_STEP_INDEX = WIZARD_STEPS.length - 1;
const STEP_INDEX = {
  photos: WIZARD_STEPS.findIndex((step) => step.id === 'photos'),
  details: WIZARD_STEPS.findIndex((step) => step.id === 'details'),
  pricing: WIZARD_STEPS.findIndex((step) => step.id === 'pricing'),
  schedule: WIZARD_STEPS.findIndex((step) => step.id === 'schedule'),
} as const;

function validateFields(values: FormValues, fields: readonly ValidatedField[]): FormErrors {
  const errors: FormErrors = {};
  for (const field of fields) {
    // field comes from this file's own fixed WIZARD_STEPS config, not request data.
    // eslint-disable-next-line security/detect-object-injection
    const error = FIELD_VALIDATORS[field](values);
    if (error) {
      // eslint-disable-next-line security/detect-object-injection
      errors[field] = error;
    }
  }
  return errors;
}

function stepIndexForField(field: string): number {
  const index = WIZARD_STEPS.findIndex((step) =>
    (step.fields as readonly string[]).includes(field),
  );
  return index === -1 ? 0 : index;
}

interface PhotosStepProps {
  readonly photos: File[];
  readonly onChange: (files: File[]) => void;
}

function PhotosStep({ photos, onChange }: PhotosStepProps): React.JSX.Element {
  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-bold text-ink">Add photos</h2>
      <p className="mb-4 text-sm text-ink-soft">The first photo is the cover. Up to 10 photos.</p>
      <PhotoDropzone files={photos} onChange={onChange} />
    </div>
  );
}

interface DetailsStepProps {
  readonly values: FormValues;
  readonly errors: FormErrors;
  readonly onChange: (field: keyof FormValues, value: string) => void;
}

function DetailsStep({ values, errors, onChange }: DetailsStepProps): React.JSX.Element {
  return (
    <div>
      <FormField id="title" label="Title" error={errors.title}>
        <TextInput
          id="title"
          value={values.title}
          invalid={Boolean(errors.title)}
          onChange={(value) => onChange('title', value)}
        />
      </FormField>

      <FormField id="description" label="Description" error={errors.description}>
        <Textarea
          id="description"
          value={values.description}
          invalid={Boolean(errors.description)}
          onChange={(value) => onChange('description', value)}
        />
      </FormField>

      <FormField id="category" label="Category" error={errors.category}>
        <Select
          id="category"
          options={CATEGORY_OPTIONS}
          value={values.category}
          invalid={Boolean(errors.category)}
          onChange={(value) => onChange('category', value)}
        />
      </FormField>

      <FormField id="condition" label="Condition" error={errors.condition}>
        <Select
          id="condition"
          options={CONDITION_OPTIONS}
          value={values.condition}
          invalid={Boolean(errors.condition)}
          onChange={(value) => onChange('condition', value)}
        />
      </FormField>

      <FormField id="deliveryMethod" label="Delivery method" error={errors.deliveryMethod}>
        <Select
          id="deliveryMethod"
          options={DELIVERY_METHOD_OPTIONS}
          value={values.deliveryMethod}
          invalid={Boolean(errors.deliveryMethod)}
          onChange={(value) => onChange('deliveryMethod', value)}
        />
      </FormField>

      <FormField id="location" label="Location" error={errors.location}>
        <SearchableSelect
          id="location"
          options={COLOMBIA_CITIES}
          value={values.location}
          placeholder="Search a city"
          invalid={Boolean(errors.location)}
          onChange={(value) => onChange('location', value)}
        />
      </FormField>
    </div>
  );
}

interface PricingStepProps {
  readonly priceCOP: string;
  readonly error: string | undefined;
  readonly onChange: (value: string) => void;
}

function PricingStep({ priceCOP, error, onChange }: PricingStepProps): React.JSX.Element {
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold text-ink">Set your starting price</h2>
      <FormField id="priceCOP" label="Price (COP)" error={error}>
        <CurrencyInput
          id="priceCOP"
          label="Price (COP)"
          value={priceCOP}
          invalid={Boolean(error)}
          onChange={onChange}
        />
      </FormField>
    </div>
  );
}

type ScheduleMode = 'now' | 'later';

interface ScheduleStepProps {
  readonly publishAt: string;
  readonly onChange: (value: string) => void;
}

function ScheduleOptionCard({
  id,
  label,
  description,
  checked,
  onSelect,
}: {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onSelect: () => void;
}): React.JSX.Element {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
        checked ? 'border-brand-500 bg-brand-50' : 'border-hairline'
      }`}
    >
      <input
        id={id}
        type="radio"
        name="schedule-mode"
        checked={checked}
        onChange={onSelect}
        className="mt-1"
      />
      <span>
        <span className="block font-medium text-ink">{label}</span>
        <span className="block text-sm text-ink-soft">{description}</span>
      </span>
    </label>
  );
}

function ScheduleStep({ publishAt, onChange }: ScheduleStepProps): React.JSX.Element {
  const [mode, setMode] = useState<ScheduleMode>(publishAt ? 'later' : 'now');

  function selectNow(): void {
    setMode('now');
    onChange('');
  }

  function selectLater(): void {
    setMode('later');
  }

  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold text-ink">When should it go live?</h2>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ScheduleOptionCard
          id="schedule-mode-now"
          label="Publish now"
          description="Goes live as soon as it's created."
          checked={mode === 'now'}
          onSelect={selectNow}
        />
        <ScheduleOptionCard
          id="schedule-mode-later"
          label="Schedule for later"
          description="Pick a future date and time."
          checked={mode === 'later'}
          onSelect={selectLater}
        />
      </div>
      {mode === 'later' && (
        <DateTimePicker value={publishAt || null} onChange={onChange} now={new Date()} />
      )}
    </div>
  );
}

interface ReviewStepProps {
  readonly values: FormValues;
  readonly photoCount: number;
  readonly onEditStep: (index: number) => void;
}

function ReviewSection({
  title,
  onEdit,
  editLabel,
  children,
}: {
  readonly title: string;
  readonly onEdit: () => void;
  readonly editLabel: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-hairline p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-ink">{title}</p>
        <button type="button" onClick={onEdit} className="text-sm text-brand-600 underline">
          {editLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

function ReviewStep({ values, photoCount, onEditStep }: ReviewStepProps): React.JSX.Element {
  const scheduleLabel = values.publishAt
    ? new Date(values.publishAt).toLocaleString()
    : 'Publish now';
  const priceLabel = values.priceCOP ? formatCOP(Number(values.priceCOP)) : '';

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-ink">Review your listing</h2>

      <ReviewSection
        title="Photos"
        editLabel="Edit photos"
        onEdit={() => onEditStep(STEP_INDEX.photos)}
      >
        <p className="text-sm text-ink-soft">{photoCount} photo(s) selected</p>
      </ReviewSection>

      <ReviewSection
        title="Details"
        editLabel="Edit details"
        onEdit={() => onEditStep(STEP_INDEX.details)}
      >
        <p className="text-sm text-ink-soft">{values.title}</p>
        <p className="text-sm text-ink-soft">{values.location}</p>
      </ReviewSection>

      <ReviewSection
        title="Pricing"
        editLabel="Edit pricing"
        onEdit={() => onEditStep(STEP_INDEX.pricing)}
      >
        <p className="text-sm text-ink-soft">{priceLabel}</p>
      </ReviewSection>

      <ReviewSection
        title="Schedule"
        editLabel="Edit schedule"
        onEdit={() => onEditStep(STEP_INDEX.schedule)}
      >
        <p className="text-sm text-ink-soft">{scheduleLabel}</p>
      </ReviewSection>
    </div>
  );
}

interface StepContentProps {
  readonly currentStep: WizardStep | undefined;
  readonly values: FormValues;
  readonly errors: FormErrors;
  readonly photos: File[];
  readonly onFieldChange: (field: keyof FormValues, value: string) => void;
  readonly onPhotosChange: (files: File[]) => void;
  readonly onEditStep: (index: number) => void;
}

function StepContent({
  currentStep,
  values,
  errors,
  photos,
  onFieldChange,
  onPhotosChange,
  onEditStep,
}: StepContentProps): React.JSX.Element | null {
  switch (currentStep?.id) {
    case 'photos':
      return <PhotosStep photos={photos} onChange={onPhotosChange} />;
    case 'details':
      return <DetailsStep values={values} errors={errors} onChange={onFieldChange} />;
    case 'pricing':
      return (
        <PricingStep
          priceCOP={values.priceCOP}
          error={errors.priceCOP}
          onChange={(value) => onFieldChange('priceCOP', value)}
        />
      );
    case 'schedule':
      return (
        <ScheduleStep
          publishAt={values.publishAt}
          onChange={(value) => onFieldChange('publishAt', value)}
        />
      );
    case 'review':
      return <ReviewStep values={values} photoCount={photos.length} onEditStep={onEditStep} />;
    default:
      return null;
  }
}

/** Resolves a create-auction failure into either field errors or a top-level message. */
function resolveSubmitError(error: unknown): { fields?: FormErrors; message?: string } {
  if (error instanceof ApiError && error.fields) {
    return { fields: error.fields };
  }
  if (error instanceof ApiError) {
    return { message: error.message };
  }
  return { message: 'Something went wrong. Please try again.' };
}

export interface CreateAuctionWizardProps {
  readonly onSuccess?: ((auctionId: string) => void) | undefined;
}

export function CreateAuctionWizard({ onSuccess }: CreateAuctionWizardProps): React.JSX.Element {
  const [stepIndex, setStepIndex] = useState(0);
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

  function goToStep(index: number): void {
    setStepIndex(index);
  }

  function handleContinue(): void {
    // stepIndex is bounded to WIZARD_STEPS.length by goToStep, not request data.
    // eslint-disable-next-line security/detect-object-injection
    const step = WIZARD_STEPS[stepIndex];
    if (!step) {
      return;
    }
    const stepErrors = validateFields(values, step.fields);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) {
      goToStep(Math.min(stepIndex + 1, LAST_STEP_INDEX));
    }
  }

  function handleBack(): void {
    goToStep(Math.max(stepIndex - 1, 0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setServerError(undefined);

    const allErrors = validateFields(values, Object.keys(FIELD_VALIDATORS) as ValidatedField[]);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstField = Object.keys(allErrors)[0];
      goToStep(stepIndexForField(firstField ?? ''));
      return;
    }

    setSubmitting(true);
    try {
      const auction = await createAuction(values);
      if (photos.length > 0) {
        await uploadAuctionPhotos(auction.id, photos);
      }
      onSuccess?.(auction.id);
    } catch (error) {
      const resolved = resolveSubmitError(error);
      if (resolved.fields) {
        setErrors(resolved.fields);
        goToStep(stepIndexForField(Object.keys(resolved.fields)[0] ?? ''));
      } else {
        setServerError(resolved.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // stepIndex is bounded to WIZARD_STEPS.length by goToStep, not request data.
  // eslint-disable-next-line security/detect-object-injection
  const currentStep = WIZARD_STEPS[stepIndex];
  const isReview = currentStep?.id === 'review';

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate>
      <Stepper steps={STEP_LABELS} currentIndex={stepIndex} />

      <div className="my-6">
        <StepContent
          currentStep={currentStep}
          values={values}
          errors={errors}
          photos={photos}
          onFieldChange={updateField}
          onPhotosChange={setPhotos}
          onEditStep={goToStep}
        />
      </div>

      {serverError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {serverError}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-hairline pt-4">
        <Button type="button" onClick={handleBack} disabled={stepIndex === 0} className="w-auto">
          Back
        </Button>
        <span className="text-xs text-ink-soft">
          Step {stepIndex + 1} of {WIZARD_STEPS.length}
        </span>
        {isReview ? (
          <Button type="submit" disabled={submitting} className="w-auto">
            {submitting ? 'Creating auction…' : 'Create auction'}
          </Button>
        ) : (
          <Button type="button" onClick={handleContinue} className="w-auto">
            Continue
          </Button>
        )}
      </div>
    </form>
  );
}
