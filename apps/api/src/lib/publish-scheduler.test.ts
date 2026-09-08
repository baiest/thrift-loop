import { describe, expect, it, vi } from 'vitest';
import type { Auction } from '../models/auction.js';
import type { AuctionPatch, AuctionRepository } from '../repositories/auction.repository.js';
import { publishDueAuctions, startPublishScheduler } from './publish-scheduler.js';

function makeAuction(overrides: Partial<Auction> = {}): Auction {
  return {
    id: 'AUC-1',
    userId: 'USR-1',
    category: 'jeans',
    condition: 'good',
    priceCOP: 50_000,
    publishAt: null,
    status: 'draft',
    deliveryMethod: 'pickup',
    photoKeys: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeFakeRepository(dueAuctions: Auction[]): AuctionRepository & {
  updateCalls: { id: string; patch: AuctionPatch }[];
} {
  const updateCalls: { id: string; patch: AuctionPatch }[] = [];
  return {
    updateCalls,
    findById: () => Promise.resolve(null),
    findByUserId: () => Promise.resolve([]),
    findDueForPublish: () => Promise.resolve(dueAuctions),
    save: () => Promise.resolve(),
    update: (id, patch) => {
      updateCalls.push({ id, patch });
      return Promise.resolve(null);
    },
    delete: () => Promise.resolve(),
    addPhotoKeys: () => Promise.resolve(null),
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
