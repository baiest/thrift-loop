#!/usr/bin/env tsx
// E2E-only fixture script: wipes apps/api/data/* and writes a small,
// deterministic dataset for the Playwright suite (e2e/). Not part of the
// shipped app, not spec-gated (see AGENTS.md — SDD applies to product
// features, not throwaway local tooling like this or scripts/seed.ts).
//
// Unlike scripts/seed.ts (randomized bid amounts, meant for manual dev
// browsing), everything here is a fixed literal so tests can assert exact
// values. Always clears first — safe to rerun.
//
// Usage (from apps/api): tsx scripts/seed-e2e.ts
import 'dotenv/config';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildContainer } from '../src/container.js';

// Not a real credential — this repo's data dir is gitignored and local-only.
// eslint-disable-next-line sonarjs/no-hardcoded-passwords
const E2E_PASSWORD = 'Password123';
const DATA_DIR = join(process.cwd(), 'data');

const SELLER = {
  phone: '3010000001',
  firstName: 'Sonia',
  lastName: 'Vendedora',
  city: 'Bogotá D.C.',
  categoryPreference: '',
};

const BIDDER = {
  phone: '3010000002',
  firstName: 'Bruno',
  lastName: 'Comprador',
  city: 'Bogotá D.C.',
  categoryPreference: '',
};

const NO_BIDS_AUCTION_PRICE_COP = 40_000;
const REALTIME_AUCTION_PRICE_COP = 40_000;
const NOTIFICATIONS_AUCTION_PRICE_COP = 40_000;
const SOLD_AUCTION_PRICE_COP = 30_000;
const SOLD_AUCTION_WINNING_BID_COP = 35_000;
const E2E_MAX_BID_INCREMENT_COP = 30_000;

async function clearData(): Promise<void> {
  await rm(join(DATA_DIR, 'users.json'), { force: true });
  await rm(join(DATA_DIR, 'auctions.json'), { force: true });
  await rm(join(DATA_DIR, 'bids.json'), { force: true });
  await rm(join(DATA_DIR, 'notifications.json'), { force: true });
  await rm(join(DATA_DIR, 'uploads'), { recursive: true, force: true });
}

async function main(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    console.error('Refusing to seed: NODE_ENV=production.');
    process.exit(1);
  }

  await clearData();
  const container = buildContainer();

  const { user: seller } = await container.authService.register({
    ...SELLER,
    password: E2E_PASSWORD,
    confirmPassword: E2E_PASSWORD,
  });
  const { user: bidder } = await container.authService.register({
    ...BIDDER,
    password: E2E_PASSWORD,
    confirmPassword: E2E_PASSWORD,
  });

  // "E2E No Bids Auction" — bidding.spec.ts places bids against this one.
  const noBidsAuction = await container.auctionService.createAuction(seller.id, {
    title: 'E2E No Bids Auction',
    description: 'Seeded auction with no bids yet, used by the bidding E2E spec.',
    category: 'jeans',
    condition: 'good',
    deliveryMethod: 'pickup',
    priceCOP: String(NO_BIDS_AUCTION_PRICE_COP),
    maxBidIncrementCOP: String(E2E_MAX_BID_INCREMENT_COP),
    publishAt: '',
    location: seller.city,
  });
  await container.auctionService.updateAuction(seller.id, noBidsAuction.id, {
    status: 'published',
  });

  // "E2E Realtime Auction" — realtime.spec.ts and the notifications spec bid
  // against this one from the bidder's browser context while the seller
  // watches it live.
  const realtimeAuction = await container.auctionService.createAuction(seller.id, {
    title: 'E2E Realtime Auction',
    description: 'Seeded auction with no bids yet, used by the realtime E2E spec.',
    category: 'jackets',
    condition: 'good',
    deliveryMethod: 'pickup',
    priceCOP: String(REALTIME_AUCTION_PRICE_COP),
    maxBidIncrementCOP: String(E2E_MAX_BID_INCREMENT_COP),
    publishAt: '',
    location: seller.city,
  });
  await container.auctionService.updateAuction(seller.id, realtimeAuction.id, {
    status: 'published',
  });

  // "E2E Notifications Auction" — the notifications/profile spec bids
  // against this one to trigger a "bid on my listing" notification for the
  // seller, kept separate from the realtime auction to avoid cross-spec
  // ordering coupling.
  const notificationsAuction = await container.auctionService.createAuction(seller.id, {
    title: 'E2E Notifications Auction',
    description: 'Seeded auction with no bids yet, used by the notifications E2E spec.',
    category: 'boots',
    condition: 'good',
    deliveryMethod: 'pickup',
    priceCOP: String(NOTIFICATIONS_AUCTION_PRICE_COP),
    maxBidIncrementCOP: String(E2E_MAX_BID_INCREMENT_COP),
    publishAt: '',
    location: seller.city,
  });
  await container.auctionService.updateAuction(seller.id, notificationsAuction.id, {
    status: 'published',
  });

  // "E2E Sold Auction" — already closed and won by the bidder, for
  // my-bids-and-purchases.spec.ts.
  const soldAuction = await container.auctionService.createAuction(seller.id, {
    title: 'E2E Sold Auction',
    description: 'Seeded auction already sold to the bidder.',
    category: 'sneakers',
    condition: 'unused',
    deliveryMethod: 'delivery',
    priceCOP: String(SOLD_AUCTION_PRICE_COP),
    maxBidIncrementCOP: String(E2E_MAX_BID_INCREMENT_COP),
    publishAt: '',
    location: seller.city,
  });
  await container.auctionService.updateAuction(seller.id, soldAuction.id, {
    status: 'published',
  });
  await container.bidService.placeBid(
    bidder.id,
    soldAuction.id,
    String(SOLD_AUCTION_WINNING_BID_COP),
  );
  await container.auctionRepository.update(soldAuction.id, {
    status: 'sold',
    winnerUserId: bidder.id,
  });

  console.log(
    `Seeded seller (${SELLER.phone}) and bidder (${BIDDER.phone}), password: ${E2E_PASSWORD}.`,
  );
  console.log(
    'Seeded auctions: E2E No Bids Auction, E2E Realtime Auction, ' +
      'E2E Notifications Auction, E2E Sold Auction.',
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
