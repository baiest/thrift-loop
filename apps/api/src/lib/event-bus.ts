export type DomainEvent =
  | {
      type: 'bid-placed';
      auctionId: string;
      auctionTitle: string;
      ownerUserId: string;
      bidderId: string;
      bidderFirstName: string;
      amountCOP: number;
      bidCount: number;
      bidEndsAt: string | null;
      previousTopBidderId: string | null;
      occurredAt: string;
    }
  | {
      type: 'auction-closed';
      auctionId: string;
      auctionTitle: string;
      ownerUserId: string;
      winnerUserId: string;
      finalPriceCOP: number;
      occurredAt: string;
    };

export interface EventBus {
  publish(event: DomainEvent): void;
  subscribe(listener: (event: DomainEvent) => void): () => void;
}

/**
 * An in-process, synchronous pub/sub bus. Only serializes within a single Node
 * process, like lib/keyed-mutex.ts — a multi-instance deployment needs a
 * different EventBus implementation behind this same interface.
 */
export function createEventBus(): EventBus {
  const listeners = new Set<(event: DomainEvent) => void>();

  return {
    publish(event) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error: unknown) {
          console.error('Event listener failed', error);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
