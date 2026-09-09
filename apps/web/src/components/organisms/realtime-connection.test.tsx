import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { PublicUser } from '@thrift-loop/shared';
import { useAuthStore } from '../../stores/auth-store.js';
import { useRealtimeStore } from '../../stores/realtime-store.js';

const fakeClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  onMessage: vi.fn().mockReturnValue(() => undefined),
  onStatusChange: vi.fn().mockReturnValue(() => undefined),
};

vi.mock('../../lib/realtime-client.js', () => ({
  createRealtimeClient: () => fakeClient,
  getSharedRealtimeClient: () => fakeClient,
}));

vi.mock('../../lib/api-client.js', async () => {
  const actual = await vi.importActual('../../lib/api-client.js');
  return { ...actual, fetchNotifications: vi.fn() };
});

const { fetchNotifications } = await import('../../lib/api-client.js');
const { RealtimeConnection } = await import('./realtime-connection.js');

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

describe('RealtimeConnection', () => {
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
    fakeClient.connect.mockClear();
    fakeClient.disconnect.mockClear();
    vi.mocked(fetchNotifications).mockReset();
    vi.mocked(fetchNotifications).mockResolvedValue({ notifications: [], unreadCount: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing', () => {
    const { container } = render(<RealtimeConnection />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not connect when signed out', () => {
    render(<RealtimeConnection />);
    expect(fakeClient.connect).not.toHaveBeenCalled();
  });

  it('connects when signed in', () => {
    useAuthStore.getState().setUser(sampleUser);
    render(<RealtimeConnection />);
    expect(fakeClient.connect).toHaveBeenCalled();
  });

  it('disconnects when signing out', () => {
    useAuthStore.getState().setUser(sampleUser);
    const { rerender } = render(<RealtimeConnection />);

    useAuthStore.getState().clearUser();
    rerender(<RealtimeConnection />);

    expect(fakeClient.disconnect).toHaveBeenCalled();
  });

  it('pipes server messages into the realtime store', () => {
    useAuthStore.getState().setUser(sampleUser);
    render(<RealtimeConnection />);

    const messageHandler = fakeClient.onMessage.mock.calls[0]?.[0] as (message: unknown) => void;
    messageHandler({ type: 'presence', auctionId: 'AUC-1', viewers: 2 });

    expect(useRealtimeStore.getState().viewersByAuctionId['AUC-1']).toBe(2);
  });

  it('refetches notifications when the connection reaches open', async () => {
    useAuthStore.getState().setUser(sampleUser);
    vi.mocked(fetchNotifications).mockResolvedValue({ notifications: [], unreadCount: 4 });
    render(<RealtimeConnection />);

    const statusHandler = fakeClient.onStatusChange.mock.calls[0]?.[0] as (status: string) => void;
    statusHandler('open');

    await vi.waitFor(() => {
      expect(useRealtimeStore.getState().unreadCount).toBe(4);
    });
  });
});
