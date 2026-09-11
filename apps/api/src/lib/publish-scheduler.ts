import type { Auction } from '../models/auction.js';
import type { AuctionRepository } from '../repositories/auction.repository.js';
import type { BidRepository } from '../repositories/bid.repository.js';
import type { KeyedMutex } from './keyed-mutex.js';
import type { EventBus } from './event-bus.js';
import type { Logger } from './logger.js';
import { createPrefixedId } from './prefixed-id.js';
import { runWithRequestId } from './request-context.js';

export async function publishDueAuctions(
  auctionRepository: AuctionRepository,
  now: Date,
  logger: Logger,
): Promise<void> {
  const due = await auctionRepository.findDueForPublish(now);
  for (const auction of due) {
    await auctionRepository.update(auction.id, { status: 'published' });
    logger.info('auction_published', { auctionId: auction.id });
  }
}

export function startPublishScheduler(
  auctionRepository: AuctionRepository,
  intervalMs: number,
  logger: Logger,
): () => void {
  const timer = setInterval(() => {
    runWithRequestId(createPrefixedId('TICK'), () => {
      publishDueAuctions(auctionRepository, new Date(), logger).catch((error: unknown) => {
        logger.critical('scheduler_tick_failed', {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    });
  }, intervalMs);

  return () => clearInterval(timer);
}

/**
 * Closes one auction, whether its bid window elapsed or an owner closed it
 * early: the winner is whoever placed the highest bid. Since every accepted
 * bid must beat the previous one (enforced by bid.service.ts), the newest
 * bid for an auction is also its highest, so no separate "find max" pass is
 * needed. Returns the updated auction, or null if there's no bid to award it
 * to (or it no longer exists) — callers decide what that means for them.
 */
export async function closeOneAuction(
  auctionRepository: AuctionRepository,
  bidRepository: BidRepository,
  eventBus: EventBus,
  logger: Logger,
  auctionId: string,
): Promise<Auction | null> {
  const bids = await bidRepository.findByAuctionId(auctionId);
  const winningBid = bids[0];
  if (!winningBid) {
    return null;
  }
  const auction = await auctionRepository.findById(auctionId);
  const updated = await auctionRepository.update(auctionId, {
    status: 'sold',
    winnerUserId: winningBid.userId,
  });
  if (!auction || !updated) {
    return null;
  }
  logger.info('auction_closed', {
    auctionId,
    winnerUserId: winningBid.userId,
    finalPriceCOP: winningBid.amountCOP,
  });
  eventBus.publish({
    type: 'auction-closed',
    auctionId,
    auctionTitle: auction.title,
    ownerUserId: auction.userId,
    winnerUserId: winningBid.userId,
    finalPriceCOP: winningBid.amountCOP,
    occurredAt: new Date().toISOString(),
  });
  return updated;
}

export async function closeDueAuctions(
  auctionRepository: AuctionRepository,
  bidRepository: BidRepository,
  mutex: KeyedMutex,
  eventBus: EventBus,
  now: Date,
  logger: Logger,
): Promise<void> {
  const due = await auctionRepository.findDueForClose(now);
  for (const auction of due) {
    // Same mutex key as bid.service.ts's placeBid, so a bid can never land in
    // the same instant this auction closes.
    await mutex.runExclusive(auction.id, () =>
      closeOneAuction(auctionRepository, bidRepository, eventBus, logger, auction.id),
    );
  }
}

export function startAuctionScheduler(
  auctionRepository: AuctionRepository,
  bidRepository: BidRepository,
  mutex: KeyedMutex,
  eventBus: EventBus,
  intervalMs: number,
  logger: Logger,
): () => void {
  const timer = setInterval(() => {
    runWithRequestId(createPrefixedId('TICK'), () => {
      const now = new Date();
      publishDueAuctions(auctionRepository, now, logger)
        .then(() =>
          closeDueAuctions(auctionRepository, bidRepository, mutex, eventBus, now, logger),
        )
        .catch((error: unknown) => {
          logger.critical('scheduler_tick_failed', {
            message: error instanceof Error ? error.message : String(error),
          });
        });
    });
  }, intervalMs);

  return () => clearInterval(timer);
}
