import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ITEM_CATEGORIES } from '@thrift-loop/shared';
import { fetchCurrentUser, logout, updateProfile } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { TextInput } from '../components/atoms/text-input.js';
import { Select, type SelectOption } from '../components/atoms/select.js';
import { Button } from '../components/atoms/button.js';
import { FormField } from '../components/molecules/form-field.js';

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

const CATEGORY_PREFERENCE_OPTIONS: SelectOption[] = ITEM_CATEGORIES.map((value) => ({
  value,
  label: humanize(value),
}));

export function ProfilePage(): React.JSX.Element | null {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [checkingSession, setCheckingSession] = useState(user === null);
  const [address, setAddress] = useState('');
  const [categoryPreference, setCategoryPreference] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const loggingOut = useRef(false);

  useEffect(() => {
    if (user) {
      setAddress(user.address ?? '');
      setCategoryPreference(user.categoryPreference ?? '');
      return;
    }
    if (loggingOut.current) {
      return;
    }
    void fetchCurrentUser()
      .then((currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setAddress(currentUser.address ?? '');
          setCategoryPreference(currentUser.categoryPreference ?? '');
        } else {
          void navigate('/login');
        }
      })
      .finally(() => setCheckingSession(false));
  }, [user, setUser, navigate]);

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateProfile({ address, categoryPreference });
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

  if (checkingSession || !user) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6 pt-20">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">My profile</h1>
      <form onSubmit={(event) => void handleSave(event)}>
        <FormField id="address" label="Address">
          <TextInput
            id="address"
            value={address}
            placeholder="Where should we ship your purchases?"
            onChange={setAddress}
          />
        </FormField>
        <FormField id="categoryPreference" label="Category preference">
          <Select
            id="categoryPreference"
            options={CATEGORY_PREFERENCE_OPTIONS}
            value={categoryPreference}
            placeholder="No preference"
            onChange={setCategoryPreference}
          />
        </FormField>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {saved && <p className="mt-2 text-sm text-emerald-700">Saved.</p>}
      </form>
      <Button type="button" onClick={() => void handleLogout()} className="mt-6">
        Log out
      </Button>
    </main>
  );
}
