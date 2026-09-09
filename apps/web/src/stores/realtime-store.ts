import { create } from 'zustand';
import type { RealtimeStatus } from '../lib/realtime-client.js';
import type { ServerMessage } from '@thrift-loop/shared';

export interface AuctionUpdate {
  currentBidCOP: number;
  bidCount: number;
  bidEndsAt: string | null;
  closed: boolean;
  winnerUserId: string | null;
}

interface RealtimeState {
  status: RealtimeStatus;
  hasConnectedOnce: boolean;
  resyncToken: number;
  unreadCount: number;
  auctionUpdates: Record<string, AuctionUpdate>;
  viewersByAuctionId: Record<string, number>;
  setStatus: (status: RealtimeStatus) => void;
  setUnreadCount: (count: number) => void;
  applyServerMessage: (message: ServerMessage) => void;
}

const EMPTY_AUCTION_UPDATE: AuctionUpdate = {
  currentBidCOP: 0,
  bidCount: 0,
  bidEndsAt: null,
  closed: false,
  winnerUserId: null,
};

function nextAuctionUpdate(
  current: AuctionUpdate | undefined,
  patch: Partial<AuctionUpdate>,
): AuctionUpdate {
  return { ...EMPTY_AUCTION_UPDATE, ...current, ...patch };
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  status: 'idle',
  hasConnectedOnce: false,
  resyncToken: 0,
  unreadCount: 0,
  auctionUpdates: {},
  viewersByAuctionId: {},

  setStatus: (status) => {
    const { hasConnectedOnce, resyncToken } = get();
    if (status === 'open') {
      set({
        status,
        resyncToken: hasConnectedOnce ? resyncToken + 1 : resyncToken,
        hasConnectedOnce: true,
      });
      return;
    }
    set({ status });
  },

  setUnreadCount: (count) => set({ unreadCount: count }),

  applyServerMessage: (message) => {
    switch (message.type) {
      case 'notification':
        set({ unreadCount: message.unreadCount });
        return;
      case 'auction-updated':
        set((state) => ({
          auctionUpdates: {
            ...state.auctionUpdates,
            [message.auctionId]: nextAuctionUpdate(state.auctionUpdates[message.auctionId], {
              currentBidCOP: message.currentBidCOP,
              bidCount: message.bidCount,
              bidEndsAt: message.bidEndsAt,
            }),
          },
        }));
        return;
      case 'auction-closed':
        set((state) => ({
          auctionUpdates: {
            ...state.auctionUpdates,
            [message.auctionId]: nextAuctionUpdate(state.auctionUpdates[message.auctionId], {
              closed: true,
              winnerUserId: message.winnerUserId,
            }),
          },
        }));
        return;
      case 'presence':
        set((state) => ({
          viewersByAuctionId: { ...state.viewersByAuctionId, [message.auctionId]: message.viewers },
        }));
        return;
      default:
    }
  },
}));
