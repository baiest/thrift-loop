import {
  DEFAULT_AUCTION_SORT,
  MAX_PRICE_COP,
  type AuctionSort,
  type ItemCondition,
} from '@thrift-loop/shared';
import type { Auction } from '../models/auction.js';
import { readJsonArray, writeJsonArrayAtomic } from '../lib/json-file-store.js';
import type { AuctionFilter, AuctionPatch, AuctionRepository } from './auction.repository.js';

type LegacyAuction = Omit<
  Auction,
  | 'title'
  | 'description'
  | 'condition'
  | 'location'
  | 'currentBidCOP'
  | 'bidCount'
  | 'bidEndsAt'
  | 'winnerUserId'
  | 'maxBidIncrementCOP'
> &
  Partial<
    Pick<
      Auction,
      | 'title'
      | 'description'
      | 'location'
      | 'currentBidCOP'
      | 'bidCount'
      | 'bidEndsAt'
      | 'winnerUserId'
      | 'maxBidIncrementCOP'
    >
  > & { condition: string };

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

// Maps condition values written before the taxonomy changed to Good/New with
// tag/Unused/Worn onto the closest current value. Applied at read time, no
// migration script — same approach as the title/bid-field legacy defaults.
const LEGACY_CONDITION_MAP: Record<string, ItemCondition> = {
  new: 'new-with-tag',
  'like-new': 'unused',
  good: 'good',
  fair: 'worn',
  worn: 'worn',
};

function normalizeCondition(value: string): ItemCondition {
  // value is one of a small fixed set of legacy strings, not attacker input.
  // eslint-disable-next-line security/detect-object-injection
  return LEGACY_CONDITION_MAP[value] ?? 'good';
}

function normalize(raw: LegacyAuction): Auction {
  return {
    ...raw,
    title: raw.title ?? humanize(raw.category),
    description: raw.description ?? '',
    condition: normalizeCondition(raw.condition),
    location: raw.location ?? '',
    currentBidCOP: raw.currentBidCOP ?? null,
    bidCount: raw.bidCount ?? 0,
    bidEndsAt: raw.bidEndsAt ?? null,
    winnerUserId: raw.winnerUserId ?? null,
    maxBidIncrementCOP: raw.maxBidIncrementCOP ?? MAX_PRICE_COP,
  };
}

const FILTER_PREDICATES: readonly ((auction: Auction, filter: AuctionFilter) => boolean)[] = [
  (auction, filter) =>
    !filter.search || auction.title.toLowerCase().includes(filter.search.toLowerCase()),
  (auction, filter) => !filter.category || auction.category === filter.category,
  (auction, filter) => !filter.location || auction.location === filter.location,
  (auction, filter) => filter.minPriceCOP === undefined || auction.priceCOP >= filter.minPriceCOP,
  (auction, filter) => filter.maxPriceCOP === undefined || auction.priceCOP <= filter.maxPriceCOP,
];

function matchesFilter(auction: Auction, filter: AuctionFilter): boolean {
  return FILTER_PREDICATES.every((predicate) => predicate(auction, filter));
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

// Deterministic fallback for every sort comparator below: newest first, then
// id, so fixtures with identical timestamps never depend on array order.
function byRecency(a: Auction, b: Auction): number {
  return byNewestFirst(a, b) || a.id.localeCompare(b.id);
}

function effectivePriceCOP(auction: Auction): number {
  return auction.currentBidCOP ?? auction.priceCOP;
}

function bidEndsAtMillis(auction: Auction): number {
  return auction.bidEndsAt === null ? Infinity : new Date(auction.bidEndsAt).getTime();
}

function byEndingSoon(a: Auction, b: Auction): number {
  return bidEndsAtMillis(a) - bidEndsAtMillis(b) || byRecency(a, b);
}

function byPriceAscending(a: Auction, b: Auction): number {
  return effectivePriceCOP(a) - effectivePriceCOP(b) || byRecency(a, b);
}

function byPriceDescending(a: Auction, b: Auction): number {
  return effectivePriceCOP(b) - effectivePriceCOP(a) || byRecency(a, b);
}

const SORT_COMPARATORS: Record<AuctionSort, (a: Auction, b: Auction) => number> = {
  'ending-soon': byEndingSoon,
  newest: byRecency,
  'price-asc': byPriceAscending,
  'price-desc': byPriceDescending,
};

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

        .sort(SORT_COMPARATORS[filter.sort ?? DEFAULT_AUCTION_SORT]);
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
