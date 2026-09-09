import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRealtimeStore } from '../stores/realtime-store.js';

const fakeClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  onMessage: vi.fn().mockReturnValue(() => undefined),
  onStatusChange: vi.fn().mockReturnValue(() => undefined),
};

vi.mock('../lib/realtime-client.js', () => ({
  createRealtimeClient: () => fakeClient,
  getSharedRealtimeClient: () => fakeClient,
}));

const { useGridRealtime } = await import('./use-grid-realtime.js');

describe('useGridRealtime', () => {
  beforeEach(() => {
    useRealtimeStore.setState({
      status: 'idle',
      hasConnectedOnce: false,
      resyncToken: 0,
      unreadCount: 0,
      auctionUpdates: {},
      viewersByAuctionId: {},
    });
    fakeClient.send.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('subscribes to the grid room on mount', () => {
    renderHook(() => useGridRealtime());
    expect(fakeClient.send).toHaveBeenCalledWith({ type: 'subscribe-grid' });
  });

  it('unsubscribes from the grid room on unmount', () => {
    const { unmount } = renderHook(() => useGridRealtime());
    unmount();
    expect(fakeClient.send).toHaveBeenCalledWith({ type: 'unsubscribe-grid' });
  });

  it('returns an empty map when nothing has arrived yet', () => {
    const { result } = renderHook(() => useGridRealtime());
    expect(result.current).toEqual({});
  });

  it('reflects auction updates already in the store', () => {
    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-updated',
      auctionId: 'AUC-1',
      currentBidCOP: 60_000,
      bidCount: 2,
      bidEndsAt: null,
      serverTime: '2026-01-01T00:00:00.000Z',
    });

    const { result } = renderHook(() => useGridRealtime());

    expect(result.current['AUC-1']).toEqual(
      expect.objectContaining({ currentBidCOP: 60_000, bidCount: 2 }),
    );
  });
});
