import { useEffect } from 'react';
import { getSharedRealtimeClient } from '../lib/realtime-client.js';
import { useRealtimeStore, type AuctionUpdate } from '../stores/realtime-store.js';

/** Subscribes to live updates for every auction (not just one) for the
 * lifetime of the calling component — used by the Auctions grid. */
export function useGridRealtime(): Record<string, AuctionUpdate> {
  const auctionUpdates = useRealtimeStore((state) => state.auctionUpdates);

  useEffect(() => {
    const client = getSharedRealtimeClient();
    client.send({ type: 'subscribe-grid' });
    return () => {
      client.send({ type: 'unsubscribe-grid' });
    };
  }, []);

  return auctionUpdates;
}
