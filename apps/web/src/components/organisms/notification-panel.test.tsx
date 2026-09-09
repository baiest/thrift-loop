import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { PublicNotification } from '@thrift-loop/shared';
import { NotificationPanel } from './notification-panel.js';

vi.mock('../../lib/api-client.js', async () => {
  const actual = await vi.importActual('../../lib/api-client.js');
  return {
    ...actual,
    fetchNotifications: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  };
});

const { fetchNotifications, markAllNotificationsRead } = await import('../../lib/api-client.js');

function makeNotification(overrides: Partial<PublicNotification> = {}): PublicNotification {
  return {
    id: 'NTF-1',
    type: 'outbid',
    auctionId: 'AUC-1',
    auctionTitle: 'Chaqueta de cuero',
    amountCOP: 60_000,
    actorFirstName: 'Ana',
    readAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderPanel(): void {
  render(
    <MemoryRouter>
      <NotificationPanel />
    </MemoryRouter>,
  );
}

describe('NotificationPanel', () => {
  beforeEach(() => {
    vi.mocked(fetchNotifications).mockReset();
    vi.mocked(markAllNotificationsRead).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an empty state when there are no notifications', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue({ notifications: [], unreadCount: 0 });

    renderPanel();

    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it('renders each notification', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue({
      notifications: [makeNotification()],
      unreadCount: 1,
    });

    renderPanel();

    expect(await screen.findByText(/chaqueta de cuero/i)).toBeInTheDocument();
  });

  it('marks all as read when the button is clicked', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue({
      notifications: [makeNotification()],
      unreadCount: 1,
    });
    vi.mocked(markAllNotificationsRead).mockResolvedValue(1);
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText(/chaqueta de cuero/i);
    await user.click(screen.getByRole('button', { name: /mark all read/i }));

    expect(markAllNotificationsRead).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument();
    });
  });

  it('does not show the mark-all-read button when there is nothing unread', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue({
      notifications: [makeNotification({ readAt: '2026-01-02T00:00:00.000Z' })],
      unreadCount: 0,
    });

    renderPanel();

    await screen.findByText(/chaqueta de cuero/i);
    expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument();
  });
});
