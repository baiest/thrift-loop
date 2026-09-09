import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLOMBIA_CITIES, ITEM_CATEGORIES } from '@thrift-loop/shared';
import { fetchCurrentUser, logout, updateProfile } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { TextInput } from '../components/atoms/text-input.js';
import { Select, type SelectOption } from '../components/atoms/select.js';
import { Skeleton } from '../components/atoms/skeleton.js';
import { Button } from '../components/atoms/button.js';
import { FormField } from '../components/molecules/form-field.js';
import { SearchableSelect } from '../components/molecules/searchable-select.js';

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

const CATEGORY_PREFERENCE_OPTIONS: SelectOption[] = ITEM_CATEGORIES.map((value) => ({
  value,
  label: humanize(value),
}));

interface ProfileFormState {
  firstName: string;
  lastName: string;
  city: string;
  address: string;
  categoryPreference: string;
}

function fieldsFromUser(user: {
  firstName: string;
  lastName: string;
  city: string;
  address: string | null;
  categoryPreference: string | null;
}): ProfileFormState {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    city: user.city,
    address: user.address ?? '',
    categoryPreference: user.categoryPreference ?? '',
  };
}

export function ProfilePage(): React.JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [checkingSession, setCheckingSession] = useState(user === null);
  const [fields, setFields] = useState<ProfileFormState | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const loggingOut = useRef(false);

  useEffect(() => {
    if (user) {
      setFields(fieldsFromUser(user));
      return;
    }
    if (loggingOut.current) {
      return;
    }
    void fetchCurrentUser()
      .then((currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setFields(fieldsFromUser(currentUser));
        } else {
          void navigate('/login');
        }
      })
      .finally(() => setCheckingSession(false));
  }, [user, setUser, navigate]);

  function updateField<K extends keyof ProfileFormState>(field: K, value: string): void {
    setSaved(false);
    setFields((current) => (current ? { ...current, [field]: value } : current));
  }

  const hasUnsavedChanges = Boolean(user && fields) && !saved && !isUnchanged(user, fields);

  function isUnchanged(currentUser: typeof user, currentFields: ProfileFormState | null): boolean {
    if (!currentUser || !currentFields) {
      return true;
    }
    const baseline = fieldsFromUser(currentUser);
    // key is narrowed to keyof ProfileFormState by the cast below, not request data.
    /* eslint-disable security/detect-object-injection */
    return (Object.keys(baseline) as (keyof ProfileFormState)[]).every(
      (key) => baseline[key] === currentFields[key],
    );
    /* eslint-enable security/detect-object-injection */
  }

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!fields) {
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateProfile(fields);
      setUser(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout(): Promise<void> {
    loggingOut.current = true;
    await logout();
    clearUser();
    void navigate('/login');
  }

  if (checkingSession || !user || !fields) {
    return (
      <div aria-label="Loading profile" className="mx-auto flex max-w-2xl flex-col gap-3 py-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-24" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col py-6">
      <h1 className="mb-4 font-display text-2xl font-bold text-ink">My profile</h1>

      <div className="mb-6 rounded-lg border border-hairline p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">Country</p>
        <p className="text-sm text-ink">{user.country}</p>
      </div>

      <form onSubmit={(event) => void handleSave(event)}>
        <FormField id="firstName" label="First name">
          <TextInput
            id="firstName"
            value={fields.firstName}
            onChange={(value) => updateField('firstName', value)}
          />
        </FormField>
        <FormField id="lastName" label="Last name">
          <TextInput
            id="lastName"
            value={fields.lastName}
            onChange={(value) => updateField('lastName', value)}
          />
        </FormField>
        <FormField id="city" label="City">
          <SearchableSelect
            id="city"
            options={COLOMBIA_CITIES}
            value={fields.city}
            onChange={(value) => updateField('city', value)}
          />
        </FormField>
        <FormField id="address" label="Address">
          <TextInput
            id="address"
            value={fields.address}
            placeholder="Where should we ship your purchases?"
            onChange={(value) => updateField('address', value)}
          />
        </FormField>
        <FormField id="categoryPreference" label="Category preference">
          <Select
            id="categoryPreference"
            options={CATEGORY_PREFERENCE_OPTIONS}
            value={fields.categoryPreference}
            placeholder="No preference"
            onChange={(value) => updateField('categoryPreference', value)}
          />
        </FormField>
        {hasUnsavedChanges && <p className="mb-2 text-xs text-amber-700">Unsaved changes</p>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {saved && <p className="mt-2 text-sm text-brand-700">Saved.</p>}
      </form>
      <Button type="button" onClick={() => void handleLogout()} className="mt-6">
        Log out
      </Button>
    </div>
  );
}
