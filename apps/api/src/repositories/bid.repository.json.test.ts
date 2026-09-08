import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Bid } from '../models/bid.js';
import { createJsonBidRepository } from './bid.repository.json.js';

function makeBid(overrides: Partial<Bid> = {}): Bid {
  return {
    id: 'BID-1',
    auctionId: 'AUC-1',
    userId: 'USR-1',
    amountCOP: 50_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('createJsonBidRepository', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'thrift-loop-bids-'));
    filePath = join(tempDir, 'bids.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns an empty list when the file does not exist yet', async () => {
    const repository = createJsonBidRepository(filePath);
    await expect(repository.findByAuctionId('AUC-1')).resolves.toEqual([]);
  });

  it('saves a bid and finds it by auction id', async () => {
    const repository = createJsonBidRepository(filePath);
    await repository.save(makeBid());

    await expect(repository.findByAuctionId('AUC-1')).resolves.toEqual([makeBid()]);
  });

  it('returns bids for one auction only, newest first', async () => {
    const repository = createJsonBidRepository(filePath);
    await repository.save(
      makeBid({ id: 'BID-1', createdAt: '2026-01-01T00:00:00.000Z', amountCOP: 50_000 }),
    );
    await repository.save(
      makeBid({ id: 'BID-2', createdAt: '2026-01-02T00:00:00.000Z', amountCOP: 51_000 }),
    );
    await repository.save(
      makeBid({ id: 'BID-other', auctionId: 'AUC-2', createdAt: '2026-01-03T00:00:00.000Z' }),
    );

    const bids = await repository.findByAuctionId('AUC-1');

    expect(bids.map((bid) => bid.id)).toEqual(['BID-2', 'BID-1']);
  });
});
