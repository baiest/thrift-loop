import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Auction } from '../models/auction.js';
import type { AuctionPatch, AuctionRepository } from '../repositories/auction.repository.js';
import type { PhotoStorage, UploadedFile } from '../lib/photo-storage.js';
import { HttpError } from '../lib/http-error.js';
import { createAuctionService, type CreateAuctionInput } from './auction.service.js';

class FakeAuctionRepository implements AuctionRepository {
  private readonly auctions = new Map<string, Auction>();

  findById(id: string): Promise<Auction | null> {
    return Promise.resolve(this.auctions.get(id) ?? null);
  }

  findByUserId(userId: string): Promise<Auction[]> {
    return Promise.resolve([...this.auctions.values()].filter((a) => a.userId === userId));
  }

  findDueForPublish(before: Date): Promise<Auction[]> {
    return Promise.resolve(
      [...this.auctions.values()].filter(
        (a) => a.status === 'draft' && a.publishAt && new Date(a.publishAt) <= before,
      ),
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

  addPhotoKeys(id: string, keys: string[]): Promise<Auction | null> {
    const existing = this.auctions.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }
    const updated = { ...existing, photoKeys: [...existing.photoKeys, ...keys] };
    this.auctions.set(id, updated);
    return Promise.resolve(updated);
  }

  findAllPublished(): Promise<Auction[]> {
    return Promise.resolve(
      [...this.auctions.values()].filter((a) => a.status === 'published' || a.status === 'sold'),
    );
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
}

class FakePhotoStorage implements PhotoStorage {
  savedCalls: { userId: string; auctionId: string; files: UploadedFile[] }[] = [];
  deletedCalls: { userId: string; auctionId: string }[] = [];

  savePhotos(userId: string, auctionId: string, files: UploadedFile[]): Promise<string[]> {
    this.savedCalls.push({ userId, auctionId, files });
    return Promise.resolve(files.map((_file, index) => `${userId}/${auctionId}/${index}.jpg`));
  }

  deletePhotosForAuction(userId: string, auctionId: string): Promise<void> {
    this.deletedCalls.push({ userId, auctionId });
    return Promise.resolve();
  }
}

const validInput: CreateAuctionInput = {
  category: 'jeans',
  condition: 'good',
  deliveryMethod: 'pickup',
  priceCOP: '50000',
  publishAt: '',
};

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

describe('AuctionService', () => {
  let repository: FakeAuctionRepository;
  let photoStorage: FakePhotoStorage;
  let service: ReturnType<typeof createAuctionService>;

  beforeEach(() => {
    repository = new FakeAuctionRepository();
    photoStorage = new FakePhotoStorage();
    service = createAuctionService(repository, photoStorage);
  });

  afterEach(() => {});

  describe('createAuction', () => {
    it('creates a draft auction with an AUC-prefixed id', async () => {
      const auction = await service.createAuction('USR-1', validInput);

      expect(auction.id.startsWith('AUC-')).toBe(true);
      expect(auction.status).toBe('draft');
      expect(auction.userId).toBe('USR-1');
      expect(auction.priceCOP).toBe(50_000);
      expect(auction.createdAt).toBe(auction.updatedAt);
    });

    it('stays draft even when a future publishAt is given', async () => {
      const auction = await service.createAuction('USR-1', {
        ...validInput,
        publishAt: '2099-01-01T00:00:00.000Z',
      });

      expect(auction.status).toBe('draft');
      expect(auction.publishAt).toBe('2099-01-01T00:00:00.000Z');
    });

    it('rejects an invalid category', async () => {
      const error = await catchHttpError(
        service.createAuction('USR-1', { ...validInput, category: 'hats' }),
      );
      expect(error.status).toBe(400);
      expect(error.fields?.['category']).toBeDefined();
    });

    it('rejects an invalid condition', async () => {
      const error = await catchHttpError(
        service.createAuction('USR-1', { ...validInput, condition: 'mint' }),
      );
      expect(error.fields?.['condition']).toBeDefined();
    });

    it('rejects an invalid delivery method', async () => {
      const error = await catchHttpError(
        service.createAuction('USR-1', { ...validInput, deliveryMethod: 'teleport' }),
      );
      expect(error.fields?.['deliveryMethod']).toBeDefined();
    });

    it('rejects a non-integer price', async () => {
      const error = await catchHttpError(
        service.createAuction('USR-1', { ...validInput, priceCOP: '99.5' }),
      );
      expect(error.fields?.['priceCOP']).toBeDefined();
    });

    it('rejects a non-numeric price', async () => {
      const error = await catchHttpError(
        service.createAuction('USR-1', { ...validInput, priceCOP: 'free' }),
      );
      expect(error.fields?.['priceCOP']).toBeDefined();
    });

    it('rejects a publishAt that is not a valid date', async () => {
      const error = await catchHttpError(
        service.createAuction('USR-1', { ...validInput, publishAt: 'not-a-date' }),
      );
      expect(error.fields?.['publishAt']).toBeDefined();
    });

    it('rejects a publishAt in the past', async () => {
      const error = await catchHttpError(
        service.createAuction('USR-1', { ...validInput, publishAt: '2000-01-01T00:00:00.000Z' }),
      );
      expect(error.fields?.['publishAt']).toBeDefined();
    });
  });

  describe('updateAuction', () => {
    it('updates an editable field while draft', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      const updated = await service.updateAuction('USR-1', auction.id, { priceCOP: '75000' });

      expect(updated.priceCOP).toBe(75_000);
    });

    it('publishes a draft when status is set to published', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      const updated = await service.updateAuction('USR-1', auction.id, { status: 'published' });

      expect(updated.status).toBe('published');
    });

    it('rejects updating a published auction', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      await service.updateAuction('USR-1', auction.id, { status: 'published' });

      const error = await catchHttpError(
        service.updateAuction('USR-1', auction.id, { priceCOP: '1000' }),
      );
      expect(error.status).toBe(409);
    });

    it('returns 404 for an auction that does not exist', async () => {
      const error = await catchHttpError(
        service.updateAuction('USR-1', 'AUC-missing', { priceCOP: '1000' }),
      );
      expect(error.status).toBe(404);
    });

    it('returns 404 when the auction belongs to someone else', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      const error = await catchHttpError(
        service.updateAuction('USR-2', auction.id, { priceCOP: '1000' }),
      );
      expect(error.status).toBe(404);
    });
  });

  describe('deleteAuction', () => {
    it('deletes a draft auction and its photos', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      await service.deleteAuction('USR-1', auction.id);

      await expect(repository.findById(auction.id)).resolves.toBeNull();
      expect(photoStorage.deletedCalls).toEqual([{ userId: 'USR-1', auctionId: auction.id }]);
    });

    it('deletes a published auction too', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      await service.updateAuction('USR-1', auction.id, { status: 'published' });

      await service.deleteAuction('USR-1', auction.id);

      await expect(repository.findById(auction.id)).resolves.toBeNull();
    });

    it('returns 404 when deleting an auction owned by someone else', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      const error = await catchHttpError(service.deleteAuction('USR-2', auction.id));
      expect(error.status).toBe(404);
    });
  });

  describe('listMyAuctions / getAuction', () => {
    it('lists only the caller own auctions', async () => {
      await service.createAuction('USR-1', validInput);
      await service.createAuction('USR-2', validInput);

      const mine = await service.listMyAuctions('USR-1');
      expect(mine).toHaveLength(1);
    });

    it('returns 404 getting an auction owned by someone else', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      const error = await catchHttpError(service.getAuction('USR-2', auction.id));
      expect(error.status).toBe(404);
    });
  });

  describe('addPhotos', () => {
    function makeFiles(count: number): UploadedFile[] {
      return Array.from({ length: count }, (_unused, index) => ({
        originalName: `photo-${index}.jpg`,
        buffer: Buffer.from('x'),
      }));
    }

    it('saves photos and appends their keys to the auction', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      const updated = await service.addPhotos('USR-1', auction.id, makeFiles(3));

      expect(updated.photoKeys).toHaveLength(3);
    });

    it('rejects uploads once a draft already has 10 photos', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      await service.addPhotos('USR-1', auction.id, makeFiles(10));

      const error = await catchHttpError(service.addPhotos('USR-1', auction.id, makeFiles(1)));
      expect(error.status).toBe(409);
    });

    it('rejects a single upload that would exceed 10 total', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      const error = await catchHttpError(service.addPhotos('USR-1', auction.id, makeFiles(11)));
      expect(error.status).toBe(409);
    });

    it('rejects uploading photos to a published auction', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      await service.updateAuction('USR-1', auction.id, { status: 'published' });

      const error = await catchHttpError(service.addPhotos('USR-1', auction.id, makeFiles(1)));
      expect(error.status).toBe(409);
    });
  });

  describe('listPublishedAuctions', () => {
    it('returns published and sold auctions, but not drafts', async () => {
      const draft = await service.createAuction('USR-1', validInput);
      const published = await service.createAuction('USR-1', validInput);
      await service.updateAuction('USR-1', published.id, { status: 'published' });

      const list = await service.listPublishedAuctions();

      expect(list.map((a) => a.id)).toEqual([published.id]);
      expect(list.map((a) => a.id)).not.toContain(draft.id);
    });
  });

  describe('getAuctionForViewer', () => {
    it('lets anyone view a published auction', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      await service.updateAuction('USR-1', auction.id, { status: 'published' });

      const viewed = await service.getAuctionForViewer('USR-2', auction.id);
      expect(viewed.id).toBe(auction.id);
    });

    it('lets an anonymous viewer (null) view a published auction', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      await service.updateAuction('USR-1', auction.id, { status: 'published' });

      const viewed = await service.getAuctionForViewer(null, auction.id);
      expect(viewed.id).toBe(auction.id);
    });

    it('lets the owner view their own draft', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      const viewed = await service.getAuctionForViewer('USR-1', auction.id);
      expect(viewed.id).toBe(auction.id);
    });

    it('404s a draft for anyone else', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      const error = await catchHttpError(service.getAuctionForViewer('USR-2', auction.id));
      expect(error.status).toBe(404);
    });

    it('404s a draft for an anonymous viewer', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      const error = await catchHttpError(service.getAuctionForViewer(null, auction.id));
      expect(error.status).toBe(404);
    });

    it('404s a missing auction', async () => {
      const error = await catchHttpError(service.getAuctionForViewer(null, 'AUC-missing'));
      expect(error.status).toBe(404);
    });
  });

  describe('listMyPurchases', () => {
    it('lists auctions won by the caller', async () => {
      const auction = await service.createAuction('USR-1', validInput);
      await service.updateAuction('USR-1', auction.id, { status: 'published' });
      await repository.update(auction.id, { status: 'sold', winnerUserId: 'USR-2' });

      const purchases = await service.listMyPurchases('USR-2');
      expect(purchases.map((a) => a.id)).toEqual([auction.id]);
    });

    it('returns an empty list when the caller has won nothing', async () => {
      await expect(service.listMyPurchases('USR-9')).resolves.toEqual([]);
    });
  });
});
