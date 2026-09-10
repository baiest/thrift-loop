import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfilePage } from './profile-page.js';
import { useAuthStore } from '../stores/auth-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    updateProfile: vi.fn(),
    updateNotificationPreferences: vi.fn(),
  };
});

const { fetchCurrentUser, updateProfile, updateNotificationPreferences } =
  await import('../lib/api-client.js');

const sampleUser = {
  id: 'USR-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
  categoryPreference: null,
  notificationPreferences: { outbid: true, auctionWon: true, bidOnMyListing: true },
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
    vi.mocked(updateNotificationPreferences).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a skeleton instead of a blank screen while the session loads', () => {
    vi.mocked(fetchCurrentUser).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByLabelText('Loading profile')).toBeInTheDocument();
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

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        firstName: 'Ana',
        lastName: 'Gómez',
        city: 'Bogotá D.C.',
        address: 'Calle 2',
        categoryPreference: '',
      }),
    );
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it('pre-fills the category preference field from the current user', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, categoryPreference: 'jeans' });

    renderPage();

    expect(await screen.findByLabelText('Category preference')).toHaveValue('jeans');
  });

  it('saves a changed category preference', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(updateProfile).mockResolvedValue({ ...sampleUser, categoryPreference: 'jeans' });

    renderPage();
    await screen.findByLabelText('Address');
    await userEvent.selectOptions(screen.getByLabelText('Category preference'), 'jeans');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        firstName: 'Ana',
        lastName: 'Gómez',
        city: 'Bogotá D.C.',
        address: '',
        categoryPreference: 'jeans',
      }),
    );
  });

  it('shows the read-only country', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    expect(await screen.findByText('CO')).toBeInTheDocument();
  });

  it('uses the same heading size as the other pages', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    expect(await screen.findByText('My profile')).toHaveClass('text-3xl');
  });

  it('pre-fills first name, last name, and city from the current user', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    expect(await screen.findByLabelText('First name')).toHaveValue('Ana');
    expect(screen.getByLabelText('Last name')).toHaveValue('Gómez');
    expect(screen.getByLabelText('City')).toHaveValue('Bogotá D.C.');
  });

  it('saves a changed first name, last name, and city', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(updateProfile).mockResolvedValue({ ...sampleUser, firstName: 'Sofía' });

    renderPage();
    const firstNameInput = await screen.findByLabelText('First name');
    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, 'Sofía');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Sofía' })),
    );
  });

  it('shows an unsaved-changes indicator once a field is edited', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();
    const firstNameInput = await screen.findByLabelText('First name');

    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();

    await userEvent.type(firstNameInput, 'x');

    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
  });

  it('has no logout button of its own (the shell owns logout)', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    await screen.findByLabelText('Address');
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('shows the three notification preference toggles', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    expect(await screen.findByRole('switch', { name: /outbid/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('switch', { name: /won/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /bid on my listing/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('reflects a preference that is off', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      ...sampleUser,
      notificationPreferences: { ...sampleUser.notificationPreferences, outbid: false },
    });

    renderPage();

    expect(await screen.findByRole('switch', { name: /outbid/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('saves a toggle immediately without a Save button', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(updateNotificationPreferences).mockResolvedValue({
      ...sampleUser,
      notificationPreferences: { ...sampleUser.notificationPreferences, outbid: false },
    });

    renderPage();
    const toggle = await screen.findByRole('switch', { name: /outbid/i });
    await userEvent.click(toggle);

    await waitFor(() =>
      expect(updateNotificationPreferences).toHaveBeenCalledWith({ outbid: false }),
    );
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
  });

  it('reverts the toggle if saving the preference fails', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(updateNotificationPreferences).mockRejectedValue(new Error('failed'));

    renderPage();
    const toggle = await screen.findByRole('switch', { name: /outbid/i });
    await userEvent.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
  });
});
