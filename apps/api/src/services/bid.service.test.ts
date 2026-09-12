import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@thrift-loop/shared';
import type { Auction } from '../models/auction.js';
import type { Bid } from '../models/bid.js';
import type { AuctionPatch, AuctionRepository } from '../repositories/auction.repository.js';
import type { BidRepository } from '../repositories/bid.repository.js';
import type { User } from '../models/user.js';
import type { UserRepository } from '../repositories/user.repository.js';
import { HttpError } from '../lib/http-error.js';
import { createKeyedMutex } from '../lib/keyed-mutex.js';
import type { DomainEvent, EventBus } from '../lib/event-bus.js';
import type { Logger } from '../lib/logger.js';
import { createBidService } from './bid.service.js';

class FakeEventBus implements EventBus {
  readonly published: DomainEvent[] = [];

  publish(event: DomainEvent): void {
    this.published.push(event);
  }

  subscribe(): () => void {
    return () => undefined;
  }
}

interface RecordedLogCall {
  level: string;
  event: string;
  fields: Record<string, unknown>;
}

function createFakeLogger(): { logger: Logger; calls: RecordedLogCall[] } {
  const calls: RecordedLogCall[] = [];
  const record =
    (level: string) =>
    (event: string, fields: Record<string, unknown> = {}) => {
      calls.push({ level, event, fields });
    };
  return {
    calls,
    logger: {
      info: record('info'),
      warning: record('warning'),
      error: record('error'),
      critical: record('critical'),
      time: async (_event, _fields, fn) => fn(),
      close: async () => {},
    },
  };
}

class FakeAuctionRepository implements AuctionRepository {
  private readonly auctions = new Map<string, Auction>();

  seed(auction: Auction): void {
    this.auctions.set(auction.id, auction);
  }

  findById(id: string): Promise<Auction | null> {
    return Promise.resolve(this.auctions.get(id) ?? null);
  }

  findByUserId(userId: string): Promise<Auction[]> {
    return Promise.resolve([...this.auctions.values()].filter((a) => a.userId === userId));
  }

  findDueForPublish(): Promise<Auction[]> {
    return Promise.resolve([]);
  }

  findAllPublished(): Promise<Auction[]> {
    return Promise.resolve([...this.auctions.values()].filter((a) => a.status !== 'draft'));
  }

  findDueForClose(before: Date): Promise<Auction[]> {
    return Promise.resolve(
      [...this.auctions.values()].filter(
        (a) => a.status === 'published' && a.bidEndsAt && new Date(a.bidEndsAt) <= before,
      ),
    );
  }

  findWonByUserId(userId: string): Promise<Auction[]> {
    return Promise.resolve(
      [...this.auctions.values()].filter((a) => a.status === 'sold' && a.winnerUserId === userId),
    );
  }

  save(auction: Auction): Promise<void> {
    this.auctions.set(auction.id, auction);
    return Promise.resolve();
  }

  update(id: string, patch: AuctionPatch): Promise<Auction | null> {
    const existing = this.auctions.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.auctions.set(id, updated);
    return Promise.resolve(updated);
  }

  delete(id: string): Promise<void> {
    this.auctions.delete(id);
    return Promise.resolve();
  }

  addPhotoKeys(id: string): Promise<Auction | null> {
    return Promise.resolve(this.auctions.get(id) ?? null);
  }
}

class FakeBidRepository implements BidRepository {
  private readonly bids: Bid[] = [];

  findByAuctionId(auctionId: string): Promise<Bid[]> {
    return Promise.resolve(
      this.bids
        .filter((bid) => bid.auctionId === auctionId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  findByUserId(userId: string): Promise<Bid[]> {
    return Promise.resolve(
      this.bids
        .filter((bid) => bid.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  save(bid: Bid): Promise<void> {
    this.bids.push(bid);
    return Promise.resolve();
  }
}

class FakeUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  seed(user: User): void {
    this.users.set(user.id, user);
  }

  findByPhone(): Promise<User | null> {
    return Promise.resolve(null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  save(user: User): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }

  update(): Promise<User | null> {
    return Promise.resolve(null);
  }
}

function makeAuction(overrides: Partial<Auction> = {}): Auction {
  return {
    id: 'AUC-1',
    userId: 'USR-seller',
    title: 'Chaqueta de cuero',
    description: 'Chaqueta de cuero en excelente estado.',
    category: 'jeans',
    condition: 'good',
    priceCOP: 50_000,
    maxBidIncrementCOP: 5_000,
    publishAt: null,
    status: 'published',
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

async function catchHttpError(promise: Promise<unknown>): Promise<HttpError> {
  try {
    await promise;
    throw new Error('Expected promise to reject with an HttpError');
  } catch (error) {
    if (error instanceof HttpError) {
      return error;
    }
    throw error;
  }
}

describe('BidService', () => {
  let auctionRepository: FakeAuctionRepository;
  let bidRepository: FakeBidRepository;
  let userRepository: FakeUserRepository;
  let eventBus: FakeEventBus;
  let logCalls: RecordedLogCall[];
  let service: ReturnType<typeof createBidService>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    auctionRepository = new FakeAuctionRepository();
    bidRepository = new FakeBidRepository();
    userRepository = new FakeUserRepository();
    eventBus = new FakeEventBus();
    const fakeLogger = createFakeLogger();
    logCalls = fakeLogger.calls;
    service = createBidService(
      auctionRepository,
      bidRepository,
      userRepository,
      createKeyedMutex(),
      eventBus,
      fakeLogger.logger,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('placeBid', () => {
    it('accepts a first bid at the starting price and starts the 30-minute window', async () => {
      auctionRepository.seed(makeAuction());

      const { auction, bid } = await service.placeBid('USR-bidder', 'AUC-1', '50000');

      expect(bid.amountCOP).toBe(50_000);
      expect(auction.currentBidCOP).toBe(50_000);
      expect(auction.bidCount).toBe(1);
      expect(auction.bidEndsAt).toBe('2026-01-01T00:30:00.000Z');
    });

    it('logs bid_placed on success', async () => {
      auctionRepository.seed(makeAuction());

      await service.placeBid('USR-bidder', 'AUC-1', '50000');

      expect(logCalls).toContainEqual({
        level: 'info',
        event: 'bid_placed',
        fields: expect.objectContaining({
          auctionId: 'AUC-1',
          bidderId: 'USR-bidder',
          amountCOP: 50_000,
          bidCount: 1,
        }) as Record<string, unknown>,
      });
    });

    it('logs bid_rejected on a validation failure', async () => {
      auctionRepository.seed(makeAuction());

      await catchHttpError(service.placeBid('USR-bidder', 'AUC-1', '49999'));

      expect(logCalls).toContainEqual({
        level: 'warning',
        event: 'bid_rejected',
        fields: expect.objectContaining({
          auctionId: 'AUC-1',
          bidderId: 'USR-bidder',
          attemptedAmount: '49999',
        }) as Record<string, unknown>,
      });
    });

    it('rejects a first bid below the starting price', async () => {
      auctionRepository.seed(makeAuction());

      const error = await catchHttpError(service.placeBid('USR-bidder', 'AUC-1', '49999'));
      expect(error.status).toBe(400);
      expect(error.fields?.['amountCOP']).toBeDefined();
    });

    it('accepts a subsequent bid that beats the current one by the increment', async () => {
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder-1', 'AUC-1', '50000');

      const { auction } = await service.placeBid('USR-bidder-2', 'AUC-1', '51000');

      expect(auction.currentBidCOP).toBe(51_000);
      expect(auction.bidCount).toBe(2);
    });

    it('resets the 30-minute window on every new bid', async () => {
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder-1', 'AUC-1', '50000');

      vi.setSystemTime(new Date('2026-01-01T00:20:00.000Z'));
      const { auction } = await service.placeBid('USR-bidder-2', 'AUC-1', '51000');

      expect(auction.bidEndsAt).toBe('2026-01-01T00:50:00.000Z');
    });

    it('lets the current leader raise their own bid', async () => {
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder', 'AUC-1', '50000');

      const { auction } = await service.placeBid('USR-bidder', 'AUC-1', '51000');
      expect(auction.currentBidCOP).toBe(51_000);
    });

    it('rejects a bid below the current bid plus the increment', async () => {
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder-1', 'AUC-1', '50000');

      const error = await catchHttpError(service.placeBid('USR-bidder-2', 'AUC-1', '50500'));
      expect(error.status).toBe(400);
    });

    it('accepts a first bid exactly at the max-increment ceiling above the starting price', async () => {
      auctionRepository.seed(makeAuction({ priceCOP: 50_000, maxBidIncrementCOP: 5_000 }));

      const { auction } = await service.placeBid('USR-bidder', 'AUC-1', '55000');

      expect(auction.currentBidCOP).toBe(55_000);
    });

    it('rejects a first bid above the max-increment ceiling', async () => {
      auctionRepository.seed(makeAuction({ priceCOP: 50_000, maxBidIncrementCOP: 5_000 }));

      const error = await catchHttpError(service.placeBid('USR-bidder', 'AUC-1', '55001'));
      expect(error.status).toBe(400);
      expect(error.fields?.['amountCOP']).toBeDefined();
    });

    it('rejects a subsequent bid above the max-increment ceiling', async () => {
      auctionRepository.seed(makeAuction({ priceCOP: 50_000, maxBidIncrementCOP: 5_000 }));
      await service.placeBid('USR-bidder-1', 'AUC-1', '50000');

      const error = await catchHttpError(service.placeBid('USR-bidder-2', 'AUC-1', '55001'));
      expect(error.status).toBe(400);
      expect(error.fields?.['amountCOP']).toBeDefined();
    });

    it('accepts a subsequent bid exactly at the max-increment ceiling', async () => {
      auctionRepository.seed(makeAuction({ priceCOP: 50_000, maxBidIncrementCOP: 5_000 }));
      await service.placeBid('USR-bidder-1', 'AUC-1', '50000');

      const { auction } = await service.placeBid('USR-bidder-2', 'AUC-1', '55000');

      expect(auction.currentBidCOP).toBe(55_000);
    });

    it('rejects the seller bidding on their own auction', async () => {
      auctionRepository.seed(makeAuction({ userId: 'USR-seller' }));

      const error = await catchHttpError(service.placeBid('USR-seller', 'AUC-1', '50000'));
      expect(error.status).toBe(403);
    });

    it('rejects bidding on a draft auction', async () => {
      auctionRepository.seed(makeAuction({ status: 'draft' }));

      const error = await catchHttpError(service.placeBid('USR-bidder', 'AUC-1', '50000'));
      expect(error.status).toBe(409);
    });

    it('rejects bidding on an already-sold auction', async () => {
      auctionRepository.seed(makeAuction({ status: 'sold' }));

      const error = await catchHttpError(service.placeBid('USR-bidder', 'AUC-1', '50000'));
      expect(error.status).toBe(409);
    });

    it('rejects a bid on a missing auction', async () => {
      const error = await catchHttpError(service.placeBid('USR-bidder', 'AUC-missing', '50000'));
      expect(error.status).toBe(404);
    });

    it('rejects a bid after the window has elapsed, even before the scheduler runs', async () => {
      auctionRepository.seed(
        makeAuction({
          currentBidCOP: 50_000,
          bidCount: 1,
          bidEndsAt: '2025-12-31T23:59:00.000Z',
        }),
      );

      const error = await catchHttpError(service.placeBid('USR-bidder', 'AUC-1', '51000'));
      expect(error.status).toBe(409);
    });

    it('serializes concurrent bids so exactly one wins at a given amount', async () => {
      vi.useRealTimers();
      auctionRepository.seed(makeAuction());

      const results = await Promise.allSettled([
        service.placeBid('USR-1', 'AUC-1', '50000'),
        service.placeBid('USR-2', 'AUC-1', '50000'),
        service.placeBid('USR-3', 'AUC-1', '50000'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(2);

      const stored = await auctionRepository.findById('AUC-1');
      expect(stored?.currentBidCOP).toBe(50_000);
      expect(stored?.bidCount).toBe(1);

      const bids = await bidRepository.findByAuctionId('AUC-1');
      expect(bids).toHaveLength(1);
    });

    it('publishes bid-placed with no previous top bidder on the first bid', async () => {
      auctionRepository.seed(makeAuction());

      await service.placeBid('USR-bidder', 'AUC-1', '50000');

      expect(eventBus.published).toEqual([
        expect.objectContaining({ type: 'bid-placed', previousTopBidderId: null }),
      ]);
    });

    it('publishes bid-placed with the prior bidder once someone else raises the bid', async () => {
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder-1', 'AUC-1', '50000');

      await service.placeBid('USR-bidder-2', 'AUC-1', '51000');

      expect(eventBus.published[1]).toEqual(
        expect.objectContaining({ type: 'bid-placed', previousTopBidderId: 'USR-bidder-1' }),
      );
    });

    it('publishes the same bidder as previousTopBidderId when they raise themselves', async () => {
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder', 'AUC-1', '50000');

      await service.placeBid('USR-bidder', 'AUC-1', '51000');

      expect(eventBus.published[1]).toEqual(
        expect.objectContaining({ type: 'bid-placed', previousTopBidderId: 'USR-bidder' }),
      );
    });

    it('publishes bid-placed only after the auction update resolves', async () => {
      auctionRepository.seed(makeAuction());
      const originalUpdate = auctionRepository.update.bind(auctionRepository);
      const publishedBeforeUpdateResolved: boolean[] = [];
      auctionRepository.update = async (id, patch) => {
        const result = await originalUpdate(id, patch);
        publishedBeforeUpdateResolved.push(eventBus.published.length > 0);
        return result;
      };

      await service.placeBid('USR-bidder', 'AUC-1', '50000');

      expect(publishedBeforeUpdateResolved).toEqual([false]);
      expect(eventBus.published).toHaveLength(1);
    });

    it('does not publish when the bid is rejected', async () => {
      auctionRepository.seed(makeAuction());

      await catchHttpError(service.placeBid('USR-bidder', 'AUC-1', '1'));

      expect(eventBus.published).toEqual([]);
    });
  });

  describe('listBids', () => {
    it('returns bids with the bidder first name attached, newest first', async () => {
      userRepository.seed({
        id: 'USR-bidder',
        phone: '3000000000',
        firstName: 'Ana',
        lastName: 'Gómez',
        city: 'Bogotá D.C.',
        country: 'CO',
        passwordHash: 'x',
        address: null,
        categoryPreference: null,
        notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder', 'AUC-1', '50000');

      const bids = await service.listBids('AUC-1');

      expect(bids).toEqual([
        expect.objectContaining({
          bidderId: 'USR-bidder',
          bidderFirstName: 'Ana',
          amountCOP: 50_000,
        }),
      ]);
    });
  });

  describe('listMyBids', () => {
    it('returns an empty list when the user has never bid', async () => {
      const myBids = await service.listMyBids('USR-bidder');
      expect(myBids).toEqual([]);
    });

    it('marks the user as winning when their bid is the current one', async () => {
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder', 'AUC-1', '50000');

      const myBids = await service.listMyBids('USR-bidder');

      expect(myBids).toEqual([expect.objectContaining({ myBidCOP: 50_000, isWinning: true })]);
    });

    it('marks the user as outbid once someone else raises the bid', async () => {
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder', 'AUC-1', '50000');
      await service.placeBid('USR-other', 'AUC-1', '51000');

      const myBids = await service.listMyBids('USR-bidder');

      expect(myBids).toEqual([expect.objectContaining({ myBidCOP: 50_000, isWinning: false })]);
    });

    it('collapses multiple bids on the same auction to the highest one', async () => {
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder', 'AUC-1', '50000');
      await service.placeBid('USR-other', 'AUC-1', '51000');
      await service.placeBid('USR-bidder', 'AUC-1', '52000');

      const myBids = await service.listMyBids('USR-bidder');

      expect(myBids).toHaveLength(1);
      expect(myBids[0]).toEqual(expect.objectContaining({ myBidCOP: 52_000, isWinning: true }));
    });

    it('lists one entry per auction the user has bid on, newest bid first', async () => {
      auctionRepository.seed(makeAuction({ id: 'AUC-1' }));
      auctionRepository.seed(makeAuction({ id: 'AUC-2' }));
      await service.placeBid('USR-bidder', 'AUC-1', '50000');
      vi.setSystemTime(new Date('2026-01-01T00:05:00.000Z'));
      await service.placeBid('USR-bidder', 'AUC-2', '50000');

      const myBids = await service.listMyBids('USR-bidder');

      expect(myBids.map((entry) => entry.auction.id)).toEqual(['AUC-2', 'AUC-1']);
    });

    it('is not winning once the auction sells to someone else, even at the same amount', async () => {
      auctionRepository.seed(makeAuction());
      await service.placeBid('USR-bidder', 'AUC-1', '50000');
      await auctionRepository.update('AUC-1', {
        status: 'sold',
        winnerUserId: 'USR-bidder',
      });

      const myBids = await service.listMyBids('USR-bidder');

      expect(myBids).toEqual([expect.objectContaining({ myBidCOP: 50_000, isWinning: false })]);
    });
  });
});
