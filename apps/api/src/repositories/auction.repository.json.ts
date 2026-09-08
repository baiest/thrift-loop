import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Auction } from '../models/auction.js';
import type { AuctionPatch, AuctionRepository } from './auction.repository.js';

const JSON_INDENT = 2;

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

async function readAll(filePath: string): Promise<Auction[]> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as Auction[];
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return [];
    }
    throw error;
  }
}

async function writeAll(filePath: string, auctions: Auction[]): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(dirname(filePath), { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(filePath, JSON.stringify(auctions, null, JSON_INDENT), 'utf8');
}

function isDueForPublish(auction: Auction, before: Date): boolean {
  if (auction.status !== 'draft' || !auction.publishAt) {
    return false;
  }
  return new Date(auction.publishAt).getTime() <= before.getTime();
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

    async save(auction) {
      const auctions = await readAll(filePath);
      auctions.push(auction);
      await writeAll(filePath, auctions);
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
      await writeAll(filePath, auctions);
      return updated;
    },

    async delete(id) {
      const auctions = await readAll(filePath);
      await writeAll(
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
      await writeAll(filePath, auctions);
      return updated;
    },
  };
}
