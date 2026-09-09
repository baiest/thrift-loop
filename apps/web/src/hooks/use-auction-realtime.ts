import { useEffect } from 'react';
import { getSharedRealtimeClient } from '../lib/realtime-client.js';
import { useRealtimeStore, type AuctionUpdate } from '../stores/realtime-store.js';

export interface AuctionRealtimeState {
  update: AuctionUpdate | null;
  viewers: number;
}

/** Subscribes to one auction's live updates for the lifetime of the calling
 * component — used by the auction detail page in place of the old poll. */
export function useAuctionRealtime(auctionId: string | undefined): AuctionRealtimeState {
  const update = useRealtimeStore((state) => {
    // auctionId comes from the route param via useParams, not request body input.
    // eslint-disable-next-line security/detect-object-injection
    return auctionId ? (state.auctionUpdates[auctionId] ?? null) : null;
  });
  const viewers = useRealtimeStore((state) => {
    // eslint-disable-next-line security/detect-object-injection
    return auctionId ? (state.viewersByAuctionId[auctionId] ?? 0) : 0;
  });

  useEffect(() => {
    if (!auctionId) {
      return;
    }
    const client = getSharedRealtimeClient();
    client.send({ type: 'subscribe-auction', auctionId });
    return () => {
      client.send({ type: 'unsubscribe-auction', auctionId });
    };
  }, [auctionId]);

  return { update, viewers };
}
