import { describe, expect, it, vi } from 'vitest';
import type { Auction } from '../models/auction.js';
import type { Bid } from '../models/bid.js';
import type { AuctionPatch, AuctionRepository } from '../repositories/auction.repository.js';
import type { BidRepository } from '../repositories/bid.repository.js';
import { createKeyedMutex } from './keyed-mutex.js';
import { createEventBus, type DomainEvent } from './event-bus.js';
import {
  closeDueAuctions,
  publishDueAuctions,
  startAuctionScheduler,
  startPublishScheduler,
} from './publish-scheduler.js';

function makeAuction(overrides: Partial<Auction> = {}): Auction {
  return {
    id: 'AUC-1',
    userId: 'USR-1',
    title: 'Chaqueta de cuero',
    description: 'Chaqueta de cuero en excelente estado.',
    category: 'jeans',
    condition: 'good',
    priceCOP: 50_000,
    publishAt: null,
    status: 'draft',
    deliveryMethod: 'pickup',
    photoKeys: [],
    currentBidCOP: null,
    bidCount: 0,
    bidEndsAt: null,
    winnerUserId: null,
    location: 'Cali',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeFakeRepository(
  dueAuctions: Auction[],
  dueForClose: Auction[] = [],
): AuctionRepository & {
  updateCalls: { id: string; patch: AuctionPatch }[];
  auctions: Map<string, Auction>;
} {
  const updateCalls: { id: string; patch: AuctionPatch }[] = [];
  const auctions = new Map<string, Auction>();
  for (const auction of [...dueAuctions, ...dueForClose]) {
    auctions.set(auction.id, auction);
  }
  return {
    updateCalls,
    auctions,
    findById: (id) => Promise.resolve(auctions.get(id) ?? null),
    findByUserId: () => Promise.resolve([]),
    findDueForPublish: () => Promise.resolve(dueAuctions),
    findAllPublished: () => Promise.resolve([]),
    findDueForClose: () => Promise.resolve(dueForClose),
    findWonByUserId: () => Promise.resolve([]),
    save: () => Promise.resolve(),
    update: (id, patch) => {
      updateCalls.push({ id, patch });
      const existing = auctions.get(id);
      if (!existing) {
        return Promise.resolve(null);
      }
      const updated = { ...existing, ...patch };
      auctions.set(id, updated);
      return Promise.resolve(updated);
    },
    delete: () => Promise.resolve(),
    addPhotoKeys: () => Promise.resolve(null),
  };
}

function makeFakeBidRepository(bidsByAuction: Record<string, Bid[]>): BidRepository {
  return {
    // auctionId is a test fixture key, not attacker-controlled input.
    // eslint-disable-next-line security/detect-object-injection
    findByAuctionId: (auctionId) => Promise.resolve(bidsByAuction[auctionId] ?? []),
    findByUserId: () => Promise.resolve([]),
    save: () => Promise.resolve(),
  };
}

function makeBid(overrides: Partial<Bid> = {}): Bid {
  return {
    id: 'BID-1',
    auctionId: 'AUC-1',
    userId: 'USR-bidder',
    amountCOP: 60_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('publishDueAuctions', () => {
  it('publishes every draft auction that is due', async () => {
    const due = [makeAuction({ id: 'AUC-1' }), makeAuction({ id: 'AUC-2' })];
    const repository = makeFakeRepository(due);

    await publishDueAuctions(repository, new Date('2026-02-01T00:00:00.000Z'));

    expect(repository.updateCalls).toEqual([
      { id: 'AUC-1', patch: { status: 'published' } },
      { id: 'AUC-2', patch: { status: 'published' } },
    ]);
  });

  it('does nothing when there are no due auctions', async () => {
    const repository = makeFakeRepository([]);

    await publishDueAuctions(repository, new Date());

    expect(repository.updateCalls).toEqual([]);
  });
});

describe('startPublishScheduler', () => {
  it('runs publishDueAuctions on an interval and can be stopped', async () => {
    vi.useFakeTimers();
    const repository = makeFakeRepository([makeAuction()]);
    const intervalMs = 1000;

    const stop = startPublishScheduler(repository, intervalMs);
    await vi.advanceTimersByTimeAsync(intervalMs * 2);
    expect(repository.updateCalls).toHaveLength(2);

    stop();
    await vi.advanceTimersByTimeAsync(intervalMs * 5);
    expect(repository.updateCalls).toHaveLength(2);

    vi.useRealTimers();
  });
});

describe('closeDueAuctions', () => {
  it('closes an auction whose bid window elapsed, assigning the highest bidder as winner', async () => {
    const due = makeAuction({
      id: 'AUC-1',
      status: 'published',
      currentBidCOP: 60_000,
      bidCount: 1,
      bidEndsAt: '2026-01-01T00:00:00.000Z',
    });
    const repository = makeFakeRepository([], [due]);
    const bidRepository = makeFakeBidRepository({
      'AUC-1': [makeBid({ userId: 'USR-winner', amountCOP: 60_000 })],
    });

    await closeDueAuctions(
      repository,
      bidRepository,
      createKeyedMutex(),
      createEventBus(),
      new Date('2026-02-01T00:00:00.000Z'),
    );

    expect(repository.updateCalls).toEqual([
      { id: 'AUC-1', patch: { status: 'sold', winnerUserId: 'USR-winner' } },
    ]);
  });

  it('does nothing when there are no auctions due to close', async () => {
    const repository = makeFakeRepository([], []);
    const bidRepository = makeFakeBidRepository({});

    await closeDueAuctions(
      repository,
      bidRepository,
      createKeyedMutex(),
      createEventBus(),
      new Date(),
    );

    expect(repository.updateCalls).toEqual([]);
  });

  it('publishes auction-closed with the winner when an auction closes', async () => {
    const due = makeAuction({
      id: 'AUC-1',
      status: 'published',
      currentBidCOP: 60_000,
      bidCount: 1,
      bidEndsAt: '2026-01-01T00:00:00.000Z',
    });
    const repository = makeFakeRepository([], [due]);
    const bidRepository = makeFakeBidRepository({
      'AUC-1': [makeBid({ userId: 'USR-winner', amountCOP: 60_000 })],
    });
    const eventBus = createEventBus();
    const published: DomainEvent[] = [];
    eventBus.subscribe((event) => published.push(event));

    await closeDueAuctions(
      repository,
      bidRepository,
      createKeyedMutex(),
      eventBus,
      new Date('2026-02-01T00:00:00.000Z'),
    );

    expect(published).toEqual([
      expect.objectContaining({
        type: 'auction-closed',
        auctionId: 'AUC-1',
        winnerUserId: 'USR-winner',
        finalPriceCOP: 60_000,
      }),
    ]);
  });

  it('does not publish when an auction has no bids to close with', async () => {
    const due = makeAuction({
      id: 'AUC-1',
      status: 'published',
      bidEndsAt: '2026-01-01T00:00:00.000Z',
    });
    const repository = makeFakeRepository([], [due]);
    const bidRepository = makeFakeBidRepository({});
    const eventBus = createEventBus();
    const published: DomainEvent[] = [];
    eventBus.subscribe((event) => published.push(event));

    await closeDueAuctions(
      repository,
      bidRepository,
      createKeyedMutex(),
      eventBus,
      new Date('2026-02-01T00:00:00.000Z'),
    );

    expect(published).toEqual([]);
  });
});

describe('startAuctionScheduler', () => {
  it('runs both publish and close on an interval and can be stopped', async () => {
    vi.useFakeTimers();
    const due = makeAuction({
      id: 'AUC-due-close',
      status: 'published',
      currentBidCOP: 60_000,
      bidCount: 1,
      bidEndsAt: '2020-01-01T00:00:00.000Z',
    });
    const repository = makeFakeRepository([makeAuction({ id: 'AUC-due-publish' })], [due]);
    const bidRepository = makeFakeBidRepository({
      'AUC-due-close': [makeBid({ auctionId: 'AUC-due-close', userId: 'USR-winner' })],
    });
    const intervalMs = 1000;

    const stop = startAuctionScheduler(
      repository,
      bidRepository,
      createKeyedMutex(),
      createEventBus(),
      intervalMs,
    );
    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(repository.updateCalls).toEqual(
      expect.arrayContaining([
        { id: 'AUC-due-publish', patch: { status: 'published' } },
        { id: 'AUC-due-close', patch: { status: 'sold', winnerUserId: 'USR-winner' } },
      ]),
    );

    stop();
    vi.useRealTimers();
  });
});
