import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { PublicUser } from '@thrift-loop/shared';
import { useAuthStore } from '../../stores/auth-store.js';
import { useRealtimeStore } from '../../stores/realtime-store.js';
import { NotificationBell } from './notification-bell.js';

vi.mock('../../lib/api-client.js', async () => {
  const actual = await vi.importActual('../../lib/api-client.js');
  return {
    ...actual,
    fetchNotifications: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  };
});

const { fetchNotifications } = await import('../../lib/api-client.js');

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

function renderBell(): void {
  render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    useRealtimeStore.setState({
      status: 'idle',
      hasConnectedOnce: false,
      resyncToken: 0,
      unreadCount: 0,
      auctionUpdates: {},
      viewersByAuctionId: {},
    });
    vi.mocked(fetchNotifications).mockReset();
    vi.mocked(fetchNotifications).mockResolvedValue({ notifications: [], unreadCount: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when signed out', () => {
    renderBell();
    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
  });

  it('shows the bell button when signed in', () => {
    useAuthStore.getState().setUser(sampleUser);
    renderBell();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('shows an unread badge when there are unread notifications', async () => {
    useAuthStore.getState().setUser(sampleUser);
    vi.mocked(fetchNotifications).mockResolvedValue({ notifications: [], unreadCount: 3 });

    renderBell();

    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('does not show a badge when there is nothing unread', () => {
    useAuthStore.getState().setUser(sampleUser);
    renderBell();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('updates the badge when a notification is pushed live via the store', async () => {
    useAuthStore.getState().setUser(sampleUser);
    renderBell();
    await screen.findByRole('button', { name: /notifications/i });

    useRealtimeStore.getState().applyServerMessage({
      type: 'notification',
      notification: {
        id: 'NTF-1',
        type: 'outbid',
        auctionId: 'AUC-1',
        auctionTitle: 'Chaqueta',
        amountCOP: 60_000,
        actorFirstName: 'Ana',
        readAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      unreadCount: 9,
    });

    expect(await screen.findByText('9')).toBeInTheDocument();
  });

  it('opens the panel when clicked', async () => {
    useAuthStore.getState().setUser(sampleUser);
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument();
  });
});
