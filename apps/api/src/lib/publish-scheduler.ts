import type { AuctionRepository } from '../repositories/auction.repository.js';
import type { BidRepository } from '../repositories/bid.repository.js';
import type { KeyedMutex } from './keyed-mutex.js';
import type { EventBus } from './event-bus.js';

export async function publishDueAuctions(
  auctionRepository: AuctionRepository,
  now: Date,
): Promise<void> {
  const due = await auctionRepository.findDueForPublish(now);
  for (const auction of due) {
    await auctionRepository.update(auction.id, { status: 'published' });
  }
}

export function startPublishScheduler(
  auctionRepository: AuctionRepository,
  intervalMs: number,
): () => void {
  const timer = setInterval(() => {
    publishDueAuctions(auctionRepository, new Date()).catch((error: unknown) => {
      console.error('Publish scheduler tick failed', error);
    });
  }, intervalMs);

  return () => clearInterval(timer);
}

/**
 * Closes one auction whose bid window has elapsed: the winner is whoever
 * placed the highest bid. Since every accepted bid must beat the previous one
 * (enforced by bid.service.ts), the newest bid for an auction is also its
 * highest, so no separate "find max" pass is needed.
 */
async function closeOneAuction(
  auctionRepository: AuctionRepository,
  bidRepository: BidRepository,
  eventBus: EventBus,
  auctionId: string,
): Promise<void> {
  const bids = await bidRepository.findByAuctionId(auctionId);
  const winningBid = bids[0];
  if (!winningBid) {
    return;
  }
  const auction = await auctionRepository.findById(auctionId);
  const updated = await auctionRepository.update(auctionId, {
    status: 'sold',
    winnerUserId: winningBid.userId,
  });
  if (!auction || !updated) {
    return;
  }
  eventBus.publish({
    type: 'auction-closed',
    auctionId,
    auctionTitle: auction.title,
    ownerUserId: auction.userId,
    winnerUserId: winningBid.userId,
    finalPriceCOP: winningBid.amountCOP,
    occurredAt: new Date().toISOString(),
  });
}

export async function closeDueAuctions(
  auctionRepository: AuctionRepository,
  bidRepository: BidRepository,
  mutex: KeyedMutex,
  eventBus: EventBus,
  now: Date,
): Promise<void> {
  const due = await auctionRepository.findDueForClose(now);
  for (const auction of due) {
    // Same mutex key as bid.service.ts's placeBid, so a bid can never land in
    // the same instant this auction closes.
    await mutex.runExclusive(auction.id, () =>
      closeOneAuction(auctionRepository, bidRepository, eventBus, auction.id),
    );
  }
}

export function startAuctionScheduler(
  auctionRepository: AuctionRepository,
  bidRepository: BidRepository,
  mutex: KeyedMutex,
  eventBus: EventBus,
  intervalMs: number,
): () => void {
  const timer = setInterval(() => {
    const now = new Date();
    publishDueAuctions(auctionRepository, now)
      .then(() => closeDueAuctions(auctionRepository, bidRepository, mutex, eventBus, now))
      .catch((error: unknown) => {
        console.error('Auction scheduler tick failed', error);
      });
  }, intervalMs);

  return () => clearInterval(timer);
}
