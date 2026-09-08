import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfilePage } from './profile-page.js';
import { useAuthStore } from '../stores/auth-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return { ...actual, fetchCurrentUser: vi.fn(), updateProfile: vi.fn() };
});

const { fetchCurrentUser, updateProfile } = await import('../lib/api-client.js');

const sampleUser = {
  id: 'USR-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
};

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<p>login screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(updateProfile).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to /login when there is no session', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('login screen')).toBeInTheDocument();
  });

  it('pre-fills the address field from the current user', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, address: 'Calle 1' });

    renderPage();

    expect(await screen.findByLabelText('Address')).toHaveValue('Calle 1');
  });

  it('saves the address', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(updateProfile).mockResolvedValue({ ...sampleUser, address: 'Calle 2' });

    renderPage();
    const input = await screen.findByLabelText('Address');
    await userEvent.type(input, 'Calle 2');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ address: 'Calle 2' }));
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });
});
