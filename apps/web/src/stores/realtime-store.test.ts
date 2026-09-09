import { afterEach, describe, expect, it } from 'vitest';
import { useRealtimeStore } from './realtime-store.js';

function reset(): void {
  useRealtimeStore.setState({
    status: 'idle',
    hasConnectedOnce: false,
    resyncToken: 0,
    unreadCount: 0,
    auctionUpdates: {},
    viewersByAuctionId: {},
  });
}

describe('useRealtimeStore', () => {
  afterEach(() => {
    reset();
  });

  it('starts idle with no data', () => {
    reset();
    expect(useRealtimeStore.getState().status).toBe('idle');
    expect(useRealtimeStore.getState().unreadCount).toBe(0);
  });

  it('setStatus updates the status', () => {
    reset();
    useRealtimeStore.getState().setStatus('connecting');
    expect(useRealtimeStore.getState().status).toBe('connecting');
  });

  it('does not bump resyncToken on the first open', () => {
    reset();
    useRealtimeStore.getState().setStatus('open');
    expect(useRealtimeStore.getState().resyncToken).toBe(0);
  });

  it('bumps resyncToken on every open after the first', () => {
    reset();
    useRealtimeStore.getState().setStatus('open');
    useRealtimeStore.getState().setStatus('reconnecting');
    useRealtimeStore.getState().setStatus('open');
    expect(useRealtimeStore.getState().resyncToken).toBe(1);

    useRealtimeStore.getState().setStatus('reconnecting');
    useRealtimeStore.getState().setStatus('open');
    expect(useRealtimeStore.getState().resyncToken).toBe(2);
  });

  it('setUnreadCount sets the count directly', () => {
    reset();
    useRealtimeStore.getState().setUnreadCount(5);
    expect(useRealtimeStore.getState().unreadCount).toBe(5);
  });

  it('applyServerMessage increments unreadCount from a notification message', () => {
    reset();
    useRealtimeStore.getState().setUnreadCount(2);
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
      unreadCount: 7,
    });

    expect(useRealtimeStore.getState().unreadCount).toBe(7);
  });

  it('applyServerMessage stores an auction-updated message keyed by auctionId', () => {
    reset();
    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-updated',
      auctionId: 'AUC-1',
      currentBidCOP: 60_000,
      bidCount: 3,
      bidEndsAt: '2026-01-01T00:30:00.000Z',
      serverTime: '2026-01-01T00:00:00.000Z',
    });

    expect(useRealtimeStore.getState().auctionUpdates['AUC-1']).toEqual({
      currentBidCOP: 60_000,
      bidCount: 3,
      bidEndsAt: '2026-01-01T00:30:00.000Z',
      closed: false,
      winnerUserId: null,
    });
  });

  it('applyServerMessage marks an auction closed on auction-closed', () => {
    reset();
    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-closed',
      auctionId: 'AUC-1',
      winnerUserId: 'USR-1',
      serverTime: '2026-01-01T00:00:00.000Z',
    });

    expect(useRealtimeStore.getState().auctionUpdates['AUC-1']).toEqual(
      expect.objectContaining({ closed: true, winnerUserId: 'USR-1' }),
    );
  });

  it('applyServerMessage stores viewer presence keyed by auctionId', () => {
    reset();
    useRealtimeStore.getState().applyServerMessage({
      type: 'presence',
      auctionId: 'AUC-1',
      viewers: 3,
    });

    expect(useRealtimeStore.getState().viewersByAuctionId['AUC-1']).toBe(3);
  });

  it('applyServerMessage ignores a ready/pong/error message without throwing', () => {
    reset();
    expect(() => useRealtimeStore.getState().applyServerMessage({ type: 'pong' })).not.toThrow();
  });
});
