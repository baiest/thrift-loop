import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PublicUser } from '@thrift-loop/shared';
import { NotificationsPage } from './notifications-page.js';
import { useAuthStore } from '../stores/auth-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    fetchNotifications: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  };
});

const { fetchCurrentUser, fetchNotifications } = await import('../lib/api-client.js');

const sampleUser: PublicUser = {
  id: 'USR-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO',
  address: null,
  categoryPreference: null,
  notificationPreferences: { outbid: true, auctionWon: true, bidOnMyListing: true },
};

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/notifications']}>
      <Routes>
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/login" element={<p>login screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(fetchNotifications).mockReset();
    vi.mocked(fetchNotifications).mockResolvedValue({ notifications: [], unreadCount: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to /login when there is no session', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('login screen')).toBeInTheDocument();
  });

  it('renders the notification panel for a signed-in user', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it('shows a heading', async () => {
    useAuthStore.getState().setUser(sampleUser);

    renderPage();

    expect(await screen.findByRole('heading', { name: /notifications/i })).toBeInTheDocument();
  });
});
