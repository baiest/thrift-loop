#!/usr/bin/env tsx
// Dev-only fixture script: populates data/*.json with a realistic "normal
// day" of users, auctions (with generated placeholder photos), and bids so
// the app has something to look at locally. Not part of the shipped app,
// not spec-gated (see AGENTS.md — SDD applies to product features, not
// throwaway local tooling like this or scripts/check-eol.ts).
//
// Usage (from apps/api):
//   tsx scripts/seed.ts          populate
//   tsx scripts/seed.ts --clear  wipe back to empty
import 'dotenv/config';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildContainer } from '../src/container.js';
import type { PublicUser } from '@thrift-loop/shared';

// Shared dev-only login for every seeded user, printed to the console below.
// Not a real credential — this repo's data dir is gitignored and local-only.
// eslint-disable-next-line sonarjs/no-hardcoded-passwords
const SEED_PASSWORD = 'Password123';
const DATA_DIR = join(process.cwd(), 'data');
const MIN_BID_INCREMENT_COP = 5_000;
const MAX_BID_INCREMENT_COP = 30_000;
const URGENT_WINDOW_MINUTES = 20;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const URGENT_WINDOW_MS = URGENT_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

interface SeedUser {
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  categoryPreference: string;
}

const SEED_USERS: readonly SeedUser[] = [
  {
    phone: '3001112233',
    firstName: 'Ana',
    lastName: 'Gómez',
    city: 'Bogotá D.C.',
    categoryPreference: 'jeans',
  },
  {
    phone: '3002223344',
    firstName: 'Carlos',
    lastName: 'Ramírez',
    city: 'Medellín',
    categoryPreference: 'jackets',
  },
  {
    phone: '3003334455',
    firstName: 'Valentina',
    lastName: 'Torres',
    city: 'Cali',
    categoryPreference: 'blouses',
  },
  {
    phone: '3004445566',
    firstName: 'Juan',
    lastName: 'Ballesteros',
    city: 'Cali',
    categoryPreference: 'sneakers',
  },
  {
    phone: '3005556677',
    firstName: 'Mariana',
    lastName: 'Pérez',
    city: 'Barranquilla',
    categoryPreference: 'boots',
  },
  {
    phone: '3006667788',
    firstName: 'Santiago',
    lastName: 'Rojas',
    city: 'Bucaramanga',
    categoryPreference: null,
  },
  {
    phone: '3007778899',
    firstName: 'Camila',
    lastName: 'Vargas',
    city: 'Pereira',
    categoryPreference: 'jeans',
  },
  {
    phone: '3008889900',
    firstName: 'Andrés',
    lastName: 'Castro',
    city: 'Cartagena',
    categoryPreference: null,
  },
];

type SeedStatus =
  'draft' | 'published-no-bids' | 'published-ending-soon' | 'published-fresh' | 'sold';

interface SeedAuction {
  title: string;
  description: string;
  category: string;
  condition: string;
  deliveryMethod: string;
  priceCOP: number;
  photoColor: string;
  status: SeedStatus;
  bidderCount: number;
}

const SEED_AUCTIONS: readonly SeedAuction[] = [
  {
    title: 'Chaqueta de jean clasica',
    description: 'Chaqueta de jean azul, corte recto, en buen estado general.',
    category: 'jackets',
    condition: 'good',
    deliveryMethod: 'pickup',
    priceCOP: 65_000,
    photoColor: '#4A6FA5',
    status: 'published-fresh',
    bidderCount: 2,
  },
  {
    title: 'Jean recto talla 32',
    description: 'Jean azul oscuro, poco uso, sin manchas ni rotos.',
    category: 'jeans',
    condition: 'unused',
    deliveryMethod: 'both',
    priceCOP: 45_000,
    photoColor: '#355C7D',
    status: 'published-ending-soon',
    bidderCount: 3,
  },
  {
    title: 'Botas de cuero cafe',
    description: 'Botas de cuero genuino, suela en buen estado, talla 38.',
    category: 'boots',
    condition: 'good',
    deliveryMethod: 'delivery',
    priceCOP: 90_000,
    photoColor: '#6B4226',
    status: 'published-no-bids',
    bidderCount: 0,
  },
  {
    title: 'Tenis deportivos blancos',
    description: 'Tenis blancos poco uso, ideales para correr o uso diario.',
    category: 'sneakers',
    condition: 'unused',
    deliveryMethod: 'both',
    priceCOP: 80_000,
    photoColor: '#2E8B57',
    status: 'published-fresh',
    bidderCount: 4,
  },
  {
    title: 'Blusa floral manga larga',
    description: 'Blusa estampada, tela liviana, perfecta para clima calido.',
    category: 'blouses',
    condition: 'new-with-tag',
    deliveryMethod: 'pickup',
    priceCOP: 35_000,
    photoColor: '#C97B84',
    status: 'draft',
    bidderCount: 0,
  },
  {
    title: 'Chaqueta de cuero negra',
    description: 'Chaqueta de cuero sintetico negra, corte biker, talla M.',
    category: 'jackets',
    condition: 'worn',
    deliveryMethod: 'delivery',
    priceCOP: 55_000,
    photoColor: '#1F1B16',
    status: 'sold',
    bidderCount: 3,
  },
  {
    title: 'Jean skinny talla 28',
    description: 'Jean negro elastizado, muy poco uso, tiro alto.',
    category: 'jeans',
    condition: 'good',
    deliveryMethod: 'both',
    priceCOP: 40_000,
    photoColor: '#2B2B3C',
    status: 'published-fresh',
    bidderCount: 1,
  },
  {
    title: 'Botas altas de invierno',
    description: 'Botas altas impermeables, comodas para caminar largo rato.',
    category: 'boots',
    condition: 'unused',
    deliveryMethod: 'pickup',
    priceCOP: 110_000,
    photoColor: '#5C4033',
    status: 'published-no-bids',
    bidderCount: 0,
  },
  {
    title: 'Tenis retro clasicos',
    description: 'Tenis estilo retro, suela de goma, talla 40, sin caja.',
    category: 'sneakers',
    condition: 'worn',
    deliveryMethod: 'delivery',
    priceCOP: 60_000,
    photoColor: '#8C3B3B',
    status: 'published-ending-soon',
    bidderCount: 2,
  },
  {
    title: 'Blusa de seda elegante',
    description: 'Blusa de seda color crema, ideal para ocasiones formales.',
    category: 'blouses',
    condition: 'unused',
    deliveryMethod: 'both',
    priceCOP: 70_000,
    photoColor: '#D4AF37',
    status: 'draft',
    bidderCount: 0,
  },
  {
    title: 'Chaqueta impermeable',
    description: 'Chaqueta rompevientos impermeable, buen estado, talla L.',
    category: 'jackets',
    condition: 'good',
    deliveryMethod: 'pickup',
    priceCOP: 50_000,
    photoColor: '#2F4858',
    status: 'published-fresh',
    bidderCount: 2,
  },
  {
    title: 'Jean mom fit talla 30',
    description: 'Jean estilo mom, tela gruesa, tiro alto, muy poco uso.',
    category: 'jeans',
    condition: 'new-with-tag',
    deliveryMethod: 'delivery',
    priceCOP: 48_000,
    photoColor: '#3F6C51',
    status: 'sold',
    bidderCount: 2,
  },
];

function svgPlaceholder(label: string, color: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600" viewBox="0 0 480 600">
    <rect width="480" height="600" fill="${color}"/>
    <text x="240" y="300" font-family="sans-serif" font-size="32" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return Buffer.from(svg, 'utf8');
}

async function clearData(): Promise<void> {
  await rm(join(DATA_DIR, 'users.json'), { force: true });
  await rm(join(DATA_DIR, 'auctions.json'), { force: true });
  await rm(join(DATA_DIR, 'bids.json'), { force: true });
  await rm(join(DATA_DIR, 'notifications.json'), { force: true });
  await rm(join(DATA_DIR, 'uploads'), { recursive: true, force: true });
  console.log('Cleared all seeded data under apps/api/data.');
}

async function registerUsers(
  authService: ReturnType<typeof buildContainer>['authService'],
): Promise<PublicUser[]> {
  const users: PublicUser[] = [];
  for (const seedUser of SEED_USERS) {
    const { user } = await authService.register({
      phone: seedUser.phone,
      firstName: seedUser.firstName,
      lastName: seedUser.lastName,
      city: seedUser.city,
      password: SEED_PASSWORD,
      confirmPassword: SEED_PASSWORD,
      categoryPreference: seedUser.categoryPreference ?? '',
    });
    users.push(user);
  }
  return users;
}

function nextBidAmount(currentBidCOP: number, priceCOP: number): number {
  const base = currentBidCOP === 0 ? priceCOP : currentBidCOP;
  const range = MAX_BID_INCREMENT_COP - MIN_BID_INCREMENT_COP;
  // Varies demo bid amounts for a realistic spread; not security-sensitive.
  // eslint-disable-next-line sonarjs/pseudo-random
  const increment = MIN_BID_INCREMENT_COP + Math.floor(Math.random() * range);
  return base + increment;
}

async function placeBids(
  container: ReturnType<typeof buildContainer>,
  auctionId: string,
  ownerId: string,
  bidders: readonly PublicUser[],
  priceCOP: number,
): Promise<string> {
  let currentBidCOP = 0;
  let lastBidderId = ownerId;
  for (const bidder of bidders) {
    if (bidder.id === ownerId) {
      continue;
    }
    currentBidCOP = nextBidAmount(currentBidCOP, priceCOP);
    await container.bidService.placeBid(bidder.id, auctionId, String(currentBidCOP));
    lastBidderId = bidder.id;
  }
  return lastBidderId;
}

function bidderPool(users: readonly PublicUser[], ownerId: string, count: number): PublicUser[] {
  const others = users.filter((user) => user.id !== ownerId);
  const pool: PublicUser[] = [];
  for (let i = 0; i < count; i += 1) {
    const candidate = others[i % others.length];
    if (candidate) {
      pool.push(candidate);
    }
  }
  return pool;
}

async function applyStatus(
  container: ReturnType<typeof buildContainer>,
  auctionId: string,
  ownerId: string,
  seed: SeedAuction,
  users: readonly PublicUser[],
): Promise<void> {
  if (seed.status === 'draft') {
    return;
  }

  await container.auctionService.updateAuction(ownerId, auctionId, { status: 'published' });

  if (seed.status === 'published-no-bids') {
    return;
  }

  const bidders = bidderPool(users, ownerId, seed.bidderCount);
  const winnerId = await placeBids(container, auctionId, ownerId, bidders, seed.priceCOP);

  if (seed.status === 'published-ending-soon') {
    const urgentEndsAt = new Date(Date.now() + URGENT_WINDOW_MS).toISOString();
    await container.auctionRepository.update(auctionId, { bidEndsAt: urgentEndsAt });
  } else if (seed.status === 'sold') {
    await container.auctionRepository.update(auctionId, {
      status: 'sold',
      winnerUserId: winnerId,
    });
  }
}

async function seedAuction(
  container: ReturnType<typeof buildContainer>,
  seed: SeedAuction,
  owner: PublicUser,
  users: readonly PublicUser[],
): Promise<void> {
  const auction = await container.auctionService.createAuction(owner.id, {
    title: seed.title,
    description: seed.description,
    category: seed.category,
    condition: seed.condition,
    deliveryMethod: seed.deliveryMethod,
    priceCOP: String(seed.priceCOP),
    publishAt: '',
    location: owner.city,
  });

  const photo = svgPlaceholder(seed.title, seed.photoColor);
  await container.auctionService.addPhotos(owner.id, auction.id, [
    { originalName: 'photo.svg', buffer: photo },
  ]);

  await applyStatus(container, auction.id, owner.id, seed, users);
}

async function seedData(): Promise<void> {
  const container = buildContainer();
  const users = await registerUsers(container.authService);
  console.log(`Created ${users.length} users (password: ${SEED_PASSWORD}).`);

  for (const [index, seed] of SEED_AUCTIONS.entries()) {
    const owner = users[index % users.length] as PublicUser;
    await seedAuction(container, seed, owner, users);
  }
  console.log(`Created ${SEED_AUCTIONS.length} auctions across drafts, live, and sold.`);
  console.log('Log in with any seed phone number above and this password.');
}

// Refuses to run anywhere but local dev: every seeded user gets the same
// hardcoded, committed password (SEED_PASSWORD) — safe as throwaway local
// fixtures, but real accounts with a public password if ever run against a
// production data directory.
function assertDevEnvironment(): void {
  if (process.env['NODE_ENV'] === 'production') {
    console.error(
      'Refusing to seed: NODE_ENV=production. This script creates accounts with a ' +
        'hardcoded, publicly committed password and must only run against local dev data.',
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  assertDevEnvironment();
  if (process.argv.includes('--clear')) {
    await clearData();
    return;
  }
  await seedData();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
