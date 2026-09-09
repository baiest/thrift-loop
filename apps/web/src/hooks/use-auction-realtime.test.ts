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

const { useAuctionRealtime } = await import('./use-auction-realtime.js');

describe('useAuctionRealtime', () => {
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

  it('subscribes to the auction room on mount', () => {
    renderHook(() => useAuctionRealtime('AUC-1'));

    expect(fakeClient.send).toHaveBeenCalledWith({ type: 'subscribe-auction', auctionId: 'AUC-1' });
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useAuctionRealtime('AUC-1'));
    unmount();

    expect(fakeClient.send).toHaveBeenCalledWith({
      type: 'unsubscribe-auction',
      auctionId: 'AUC-1',
    });
  });

  it('does not subscribe when auctionId is undefined', () => {
    renderHook(() => useAuctionRealtime(undefined));
    expect(fakeClient.send).not.toHaveBeenCalled();
  });

  it('resubscribes when the auctionId changes', () => {
    const { rerender } = renderHook(({ id }) => useAuctionRealtime(id), {
      initialProps: { id: 'AUC-1' },
    });

    rerender({ id: 'AUC-2' });

    expect(fakeClient.send).toHaveBeenCalledWith({
      type: 'unsubscribe-auction',
      auctionId: 'AUC-1',
    });
    expect(fakeClient.send).toHaveBeenCalledWith({
      type: 'subscribe-auction',
      auctionId: 'AUC-2',
    });
  });

  it('returns null update and zero viewers when nothing has arrived yet', () => {
    const { result } = renderHook(() => useAuctionRealtime('AUC-1'));
    expect(result.current).toEqual({ update: null, viewers: 0 });
  });

  it('reflects an auction update already in the store', () => {
    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-updated',
      auctionId: 'AUC-1',
      currentBidCOP: 60_000,
      bidCount: 2,
      bidEndsAt: null,
      serverTime: '2026-01-01T00:00:00.000Z',
    });

    const { result } = renderHook(() => useAuctionRealtime('AUC-1'));

    expect(result.current.update).toEqual(
      expect.objectContaining({ currentBidCOP: 60_000, bidCount: 2 }),
    );
  });

  it('reflects viewer presence already in the store', () => {
    useRealtimeStore.getState().applyServerMessage({
      type: 'presence',
      auctionId: 'AUC-1',
      viewers: 3,
    });

    const { result } = renderHook(() => useAuctionRealtime('AUC-1'));

    expect(result.current.viewers).toBe(3);
  });
});
