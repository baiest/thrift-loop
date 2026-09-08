import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser, updateProfile } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth-store.js';
import { TextInput } from '../components/atoms/text-input.js';
import { Button } from '../components/atoms/button.js';
import { FormField } from '../components/molecules/form-field.js';

export function ProfilePage(): React.JSX.Element | null {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [checkingSession, setCheckingSession] = useState(user === null);
  const [address, setAddress] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setAddress(user.address ?? '');
      return;
    }
    void fetchCurrentUser()
      .then((currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setAddress(currentUser.address ?? '');
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
      const updated = await updateProfile({ address });
      setUser(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
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
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {saved && <p className="mt-2 text-sm text-emerald-700">Saved.</p>}
      </form>
    </main>
  );
}
