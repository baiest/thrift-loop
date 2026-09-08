import type { Auction } from '../models/auction.js';
import { readJsonArray, writeJsonArrayAtomic } from '../lib/json-file-store.js';
import type { AuctionFilter, AuctionPatch, AuctionRepository } from './auction.repository.js';

type LegacyAuction = Omit<
  Auction,
  'title' | 'currentBidCOP' | 'bidCount' | 'bidEndsAt' | 'winnerUserId'
> &
  Partial<Pick<Auction, 'title' | 'currentBidCOP' | 'bidCount' | 'bidEndsAt' | 'winnerUserId'>>;

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

function normalize(raw: LegacyAuction): Auction {
  return {
    ...raw,
    title: raw.title ?? humanize(raw.category),
    currentBidCOP: raw.currentBidCOP ?? null,
    bidCount: raw.bidCount ?? 0,
    bidEndsAt: raw.bidEndsAt ?? null,
    winnerUserId: raw.winnerUserId ?? null,
  };
}

function matchesFilter(auction: Auction, filter: AuctionFilter): boolean {
  if (filter.search && !auction.title.toLowerCase().includes(filter.search.toLowerCase())) {
    return false;
  }
  if (filter.category && auction.category !== filter.category) {
    return false;
  }
  if (filter.minPriceCOP !== undefined && auction.priceCOP < filter.minPriceCOP) {
    return false;
  }
  if (filter.maxPriceCOP !== undefined && auction.priceCOP > filter.maxPriceCOP) {
    return false;
  }
  return true;
}

async function readAll(filePath: string): Promise<Auction[]> {
  const raw = await readJsonArray<LegacyAuction>(filePath);
  return raw.map(normalize);
}

function isDueForPublish(auction: Auction, before: Date): boolean {
  if (auction.status !== 'draft' || !auction.publishAt) {
    return false;
  }
  return new Date(auction.publishAt).getTime() <= before.getTime();
}

function isDueForClose(auction: Auction, before: Date): boolean {
  if (auction.status !== 'published' || !auction.bidEndsAt) {
    return false;
  }
  return new Date(auction.bidEndsAt).getTime() <= before.getTime();
}

function byNewestFirst(a: Auction, b: Auction): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// filePath is trusted app configuration (from container.ts), never user input.
export function createJsonAuctionRepository(filePath: string): AuctionRepository {
  return {
    async findById(id) {
      const auctions = await readAll(filePath);
      return auctions.find((auction) => auction.id === id) ?? null;
    },

    async findByUserId(userId) {
      const auctions = await readAll(filePath);
      return auctions.filter((auction) => auction.userId === userId);
    },

    async findDueForPublish(before) {
      const auctions = await readAll(filePath);
      return auctions.filter((auction) => isDueForPublish(auction, before));
    },

    async findAllPublished(filter = {}) {
      const auctions = await readAll(filePath);
      return auctions
        .filter((auction) => auction.status === 'published' || auction.status === 'sold')
        .filter((auction) => matchesFilter(auction, filter))
        .sort(byNewestFirst);
    },

    async findDueForClose(before) {
      const auctions = await readAll(filePath);
      return auctions.filter((auction) => isDueForClose(auction, before));
    },

    async findWonByUserId(userId) {
      const auctions = await readAll(filePath);
      return auctions
        .filter((auction) => auction.status === 'sold' && auction.winnerUserId === userId)
        .sort(byNewestFirst);
    },

    async save(auction) {
      const auctions = await readAll(filePath);
      auctions.push(auction);
      await writeJsonArrayAtomic(filePath, auctions);
    },

    async update(id, patch: AuctionPatch) {
      const auctions = await readAll(filePath);
      const index = auctions.findIndex((auction) => auction.id === id);
      if (index === -1) {
        return null;
      }
      // index comes from findIndex, a bounded array position, not attacker input.
      // eslint-disable-next-line security/detect-object-injection
      const existing = auctions[index] as Auction;
      const updated: Auction = { ...existing, ...patch, updatedAt: new Date().toISOString() };
      // eslint-disable-next-line security/detect-object-injection
      auctions[index] = updated;
      await writeJsonArrayAtomic(filePath, auctions);
      return updated;
    },

    async delete(id) {
      const auctions = await readAll(filePath);
      await writeJsonArrayAtomic(
        filePath,
        auctions.filter((auction) => auction.id !== id),
      );
    },

    async addPhotoKeys(id, keys) {
      const auctions = await readAll(filePath);
      const index = auctions.findIndex((auction) => auction.id === id);
      if (index === -1) {
        return null;
      }
      // index comes from findIndex, a bounded array position, not attacker input.
      // eslint-disable-next-line security/detect-object-injection
      const existing = auctions[index] as Auction;
      const updated: Auction = {
        ...existing,
        photoKeys: [...existing.photoKeys, ...keys],
        updatedAt: new Date().toISOString(),
      };
      // eslint-disable-next-line security/detect-object-injection
      auctions[index] = updated;
      await writeJsonArrayAtomic(filePath, auctions);
      return updated;
    },
  };
}
