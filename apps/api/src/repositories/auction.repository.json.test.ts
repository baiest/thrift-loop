import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Auction } from '../models/auction.js';
import { createJsonAuctionRepository } from './auction.repository.json.js';

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

describe('createJsonAuctionRepository', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'thrift-loop-auctions-'));
    filePath = join(tempDir, 'auctions.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns null when the file does not exist yet', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await expect(repository.findById('AUC-1')).resolves.toBeNull();
  });

  it('saves an auction and finds it by id', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction());

    await expect(repository.findById('AUC-1')).resolves.toEqual(makeAuction());
  });

  it('finds auctions by user id', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction({ id: 'AUC-1', userId: 'USR-1' }));
    await repository.save(makeAuction({ id: 'AUC-2', userId: 'USR-2' }));

    const mine = await repository.findByUserId('USR-1');
    expect(mine).toEqual([makeAuction({ id: 'AUC-1', userId: 'USR-1' })]);
  });

  it('finds draft auctions whose publishAt has passed', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction({ id: 'AUC-due', publishAt: '2026-01-01T00:00:00.000Z' }));
    await repository.save(makeAuction({ id: 'AUC-future', publishAt: '2099-01-01T00:00:00.000Z' }));
    await repository.save(makeAuction({ id: 'AUC-no-date', publishAt: null }));
    await repository.save(
      makeAuction({
        id: 'AUC-already-published',
        publishAt: '2026-01-01T00:00:00.000Z',
        status: 'published',
      }),
    );

    const due = await repository.findDueForPublish(new Date('2026-06-01T00:00:00.000Z'));

    expect(due.map((auction) => auction.id)).toEqual(['AUC-due']);
  });

  it('updates an auction and bumps nothing itself (caller controls updatedAt)', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction());

    const updated = await repository.update('AUC-1', { status: 'published' });

    expect(updated?.status).toBe('published');
    await expect(repository.findById('AUC-1')).resolves.toMatchObject({ status: 'published' });
  });

  it('returns null when updating an auction that does not exist', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await expect(repository.update('missing', { status: 'published' })).resolves.toBeNull();
  });

  it('deletes an auction', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction());

    await repository.delete('AUC-1');

    await expect(repository.findById('AUC-1')).resolves.toBeNull();
  });

  it('appends photo keys to an auction', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction({ photoKeys: ['a.jpg'] }));

    const updated = await repository.addPhotoKeys('AUC-1', ['b.jpg', 'c.jpg']);

    expect(updated?.photoKeys).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('returns null adding photo keys to a missing auction', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await expect(repository.addPhotoKeys('missing', ['a.jpg'])).resolves.toBeNull();
  });

  it('normalizes legacy rows written before the bid fields existed', async () => {
    const legacyRow = {
      id: 'AUC-legacy',
      userId: 'USR-1',
      category: 'jeans',
      condition: 'good',
      priceCOP: 50_000,
      publishAt: null,
      status: 'published',
      deliveryMethod: 'pickup',
      photoKeys: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    // filePath is built from mkdtemp's own return value, not attacker-controlled input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(filePath, JSON.stringify([legacyRow]), 'utf8');

    const repository = createJsonAuctionRepository(filePath);
    await expect(repository.findById('AUC-legacy')).resolves.toEqual({
      ...legacyRow,
      title: 'Jeans',
      description: '',
      location: '',
      currentBidCOP: null,
      bidCount: 0,
      bidEndsAt: null,
      winnerUserId: null,
    });
  });

  it('remaps a legacy condition value to the current taxonomy', async () => {
    const legacyRow = {
      id: 'AUC-legacy-condition',
      userId: 'USR-1',
      category: 'jeans',
      condition: 'fair',
      priceCOP: 50_000,
      publishAt: null,
      status: 'published',
      deliveryMethod: 'pickup',
      photoKeys: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    // filePath is built from mkdtemp's own return value, not attacker-controlled input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(filePath, JSON.stringify([legacyRow]), 'utf8');

    const repository = createJsonAuctionRepository(filePath);
    const found = await repository.findById('AUC-legacy-condition');

    expect(found?.condition).toBe('worn');
  });

  it('finds published and sold auctions, newest first', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction({ id: 'AUC-draft', status: 'draft' }));
    await repository.save(
      makeAuction({
        id: 'AUC-published',
        status: 'published',
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
    );
    await repository.save(
      makeAuction({ id: 'AUC-sold', status: 'sold', createdAt: '2026-01-03T00:00:00.000Z' }),
    );

    const published = await repository.findAllPublished();

    expect(published.map((auction) => auction.id)).toEqual(['AUC-sold', 'AUC-published']);
  });

  it('filters published auctions by a case-insensitive title search', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(
      makeAuction({ id: 'AUC-match', status: 'published', title: 'Chaqueta de cuero' }),
    );
    await repository.save(
      makeAuction({ id: 'AUC-nomatch', status: 'published', title: 'Botas de invierno' }),
    );

    const found = await repository.findAllPublished({ search: 'CHAQUETA' });

    expect(found.map((auction) => auction.id)).toEqual(['AUC-match']);
  });

  it('filters published auctions by category', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction({ id: 'AUC-jeans', status: 'published', category: 'jeans' }));
    await repository.save(makeAuction({ id: 'AUC-boots', status: 'published', category: 'boots' }));

    const found = await repository.findAllPublished({ category: 'boots' });

    expect(found.map((auction) => auction.id)).toEqual(['AUC-boots']);
  });

  it('filters published auctions by a price range', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction({ id: 'AUC-low', status: 'published', priceCOP: 10_000 }));
    await repository.save(makeAuction({ id: 'AUC-mid', status: 'published', priceCOP: 50_000 }));
    await repository.save(makeAuction({ id: 'AUC-high', status: 'published', priceCOP: 90_000 }));

    const found = await repository.findAllPublished({ minPriceCOP: 20_000, maxPriceCOP: 60_000 });

    expect(found.map((auction) => auction.id)).toEqual(['AUC-mid']);
  });

  it('filters published auctions by location', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction({ id: 'AUC-cali', status: 'published', location: 'Cali' }));
    await repository.save(
      makeAuction({ id: 'AUC-medellin', status: 'published', location: 'Medellín' }),
    );

    const found = await repository.findAllPublished({ location: 'Medellín' });

    expect(found.map((auction) => auction.id)).toEqual(['AUC-medellin']);
  });

  it('combines multiple filters', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(
      makeAuction({
        id: 'AUC-match',
        status: 'published',
        title: 'Chaqueta de cuero',
        category: 'jackets',
        priceCOP: 50_000,
      }),
    );
    await repository.save(
      makeAuction({
        id: 'AUC-wrong-category',
        status: 'published',
        title: 'Chaqueta de cuero',
        category: 'jeans',
        priceCOP: 50_000,
      }),
    );

    const found = await repository.findAllPublished({ search: 'chaqueta', category: 'jackets' });

    expect(found.map((auction) => auction.id)).toEqual(['AUC-match']);
  });

  it('finds published auctions whose bid window has elapsed', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(
      makeAuction({
        id: 'AUC-due',
        status: 'published',
        bidEndsAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    await repository.save(
      makeAuction({
        id: 'AUC-not-due',
        status: 'published',
        bidEndsAt: '2099-01-01T00:00:00.000Z',
      }),
    );
    await repository.save(makeAuction({ id: 'AUC-no-bids', status: 'published', bidEndsAt: null }));

    const due = await repository.findDueForClose(new Date('2026-06-01T00:00:00.000Z'));

    expect(due.map((auction) => auction.id)).toEqual(['AUC-due']);
  });

  it('finds auctions won by a user', async () => {
    const repository = createJsonAuctionRepository(filePath);
    await repository.save(makeAuction({ id: 'AUC-1', status: 'sold', winnerUserId: 'USR-1' }));
    await repository.save(makeAuction({ id: 'AUC-2', status: 'sold', winnerUserId: 'USR-2' }));
    await repository.save(makeAuction({ id: 'AUC-3', status: 'published', winnerUserId: null }));

    const won = await repository.findWonByUserId('USR-1');

    expect(won.map((auction) => auction.id)).toEqual(['AUC-1']);
  });
});
