import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request, { type Response as SupertestResponse } from 'supertest';
import express, { type Express, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import type { PublicAuction, PublicBid, PublicPurchase } from '@thrift-loop/shared';
import { signSessionToken } from '../lib/jwt.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { attachCsrfCookie, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../lib/csrf.js';
import { createKeyedMutex } from '../lib/keyed-mutex.js';
import { createJsonAuctionRepository } from '../repositories/auction.repository.json.js';
import { createJsonBidRepository } from '../repositories/bid.repository.json.js';
import type { User } from '../models/user.js';
import type { UserPatch, UserRepository } from '../repositories/user.repository.js';
import { createLocalPhotoStorage } from '../lib/photo-storage.js';
import { createAuctionService } from '../services/auction.service.js';
import { createBidService } from '../services/bid.service.js';
import { createAuctionRouter } from './auction.routes.js';

interface AuctionResponseBody {
  auction?: PublicAuction;
  auctions?: PublicAuction[];
  bids?: PublicBid[];
  purchases?: PublicPurchase[];
  bid?: PublicBid;
  serverTime?: string;
  error?: string;
  fields?: Record<string, string>;
}

function body(response: SupertestResponse): AuctionResponseBody {
  return response.body as AuctionResponseBody;
}

const validBody = {
  title: 'Chaqueta de cuero',
  category: 'jeans',
  condition: 'good',
  deliveryMethod: 'pickup',
  priceCOP: '50000',
  publishAt: '',
};

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

  update(id: string, patch: UserPatch): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }
    const updated = { ...existing, ...patch };
    this.users.set(id, updated);
    return Promise.resolve(updated);
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'USR-1',
    phone: '3000000000',
    firstName: 'Ana',
    lastName: 'Gómez',
    city: 'Bogotá D.C.',
    country: 'CO',
    passwordHash: 'x',
    address: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Mints a CSRF token tied to the given session token, the same way
 * `attachCsrfCookie` does when a real login/register response sets it. */
function mintCsrfToken(sessionToken: string): string {
  let issuedToken = '';
  const res = {
    cookie: (_name: string, value: string) => {
      issuedToken = value;
      return res;
    },
  } as unknown as Response;
  const req = { cookies: {} } as unknown as Request;

  attachCsrfCookie(req, res, sessionToken);
  return issuedToken;
}

function authAndCsrfCookies(userId = 'USR-1'): { cookieHeader: string; csrfToken: string } {
  const sessionToken = signSessionToken({ userId });
  const csrfToken = mintCsrfToken(sessionToken);
  return {
    cookieHeader: `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`,
    csrfToken,
  };
}

/** Adds both the session+CSRF cookies and the matching CSRF header a real
 * browser would echo back for a state-changing request. */
function withAuth(req: request.Test, userId = 'USR-1'): request.Test {
  const { cookieHeader, csrfToken } = authAndCsrfCookies(userId);
  return req.set('Cookie', cookieHeader).set(CSRF_HEADER_NAME, csrfToken);
}

function withSession(req: request.Test, userId = 'USR-1'): request.Test {
  return req.set('Cookie', `${SESSION_COOKIE_NAME}=${signSessionToken({ userId })}`);
}

describe('auction routes', () => {
  let app: Express;
  let dataDir: string;
  let userRepository: FakeUserRepository;

  beforeEach(async () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    dataDir = await mkdtemp(join(tmpdir(), 'thrift-loop-auction-routes-'));
    const auctionRepository = createJsonAuctionRepository(join(dataDir, 'auctions.json'));
    const bidRepository = createJsonBidRepository(join(dataDir, 'bids.json'));
    const photoStorage = createLocalPhotoStorage(join(dataDir, 'uploads'));
    userRepository = new FakeUserRepository();
    userRepository.seed(makeUser({ id: 'USR-1' }));
    userRepository.seed(makeUser({ id: 'USR-2', phone: '3000000001' }));
    const auctionService = createAuctionService(auctionRepository, photoStorage, userRepository);
    const bidService = createBidService(
      auctionRepository,
      bidRepository,
      userRepository,
      createKeyedMutex(),
    );

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auctions', createAuctionRouter(auctionService, userRepository, bidService));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('requires authentication to create an auction', async () => {
    const response = await request(app).post('/api/auctions').send(validBody);
    expect(response.status).toBe(401);
  });

  it('rejects a create request with a valid session but no CSRF token', async () => {
    const response = await withSession(request(app).post('/api/auctions')).send(validBody);
    expect(response.status).toBe(403);
  });

  it('creates a draft auction for the authenticated user', async () => {
    const response = await withAuth(request(app).post('/api/auctions')).send(validBody);

    expect(response.status).toBe(201);
    expect(body(response).auction).toMatchObject({ status: 'draft', category: 'jeans' });
  });

  it('returns 400 with field errors for an invalid submission', async () => {
    const response = await withAuth(request(app).post('/api/auctions')).send({
      ...validBody,
      category: 'hats',
    });

    expect(response.status).toBe(400);
    expect(body(response).fields?.['category']).toEqual(expect.any(String));
  });

  it('patches a draft auction with only the given fields', async () => {
    const created = await withAuth(request(app).post('/api/auctions')).send(validBody);
    const createdId = body(created).auction?.id;

    const response = await withAuth(request(app).patch(`/api/auctions/${createdId}`)).send({
      priceCOP: '75000',
    });

    expect(response.status).toBe(200);
    expect(body(response).auction?.priceCOP).toBe(75_000);
    expect(body(response).auction?.category).toBe('jeans');
  });

  it('publishes via PATCH and then rejects further edits', async () => {
    const created = await withAuth(request(app).post('/api/auctions')).send(validBody);
    const id = body(created).auction?.id as string;

    const published = await withAuth(request(app).patch(`/api/auctions/${id}`)).send({
      status: 'published',
    });
    expect(body(published).auction?.status).toBe('published');

    const secondEdit = await withAuth(request(app).patch(`/api/auctions/${id}`)).send({
      priceCOP: '1',
    });
    expect(secondEdit.status).toBe(409);
  });

  it('deletes an auction', async () => {
    const created = await withAuth(request(app).post('/api/auctions')).send(validBody);
    const id = body(created).auction?.id as string;

    const response = await withAuth(request(app).delete(`/api/auctions/${id}`));
    expect(response.status).toBe(204);

    const getResponse = await request(app).get(`/api/auctions/${id}`);
    expect(getResponse.status).toBe(404);
  });

  it('lists only the caller own auctions', async () => {
    await withAuth(request(app).post('/api/auctions')).send(validBody);
    await withAuth(request(app).post('/api/auctions'), 'USR-2').send(validBody);

    const response = await request(app)
      .get('/api/auctions/mine')
      .set('Cookie', authAndCsrfCookies().cookieHeader);

    expect(body(response).auctions).toHaveLength(1);
  });

  it('uploads photos and returns their urls on the auction', async () => {
    const created = await withAuth(request(app).post('/api/auctions')).send(validBody);
    const id = body(created).auction?.id as string;

    const response = await withAuth(request(app).post(`/api/auctions/${id}/photos`)).attach(
      'photos',
      Buffer.from('fake-jpeg-bytes'),
      { filename: 'front.jpg', contentType: 'image/jpeg' },
    );

    expect(response.status).toBe(200);
    expect(body(response).auction?.photoUrls).toHaveLength(1);
    expect(body(response).auction?.photoUrls[0]).toContain('/uploads/');
  });

  it('rejects a disallowed file type', async () => {
    const created = await withAuth(request(app).post('/api/auctions')).send(validBody);
    const id = body(created).auction?.id as string;

    const response = await withAuth(request(app).post(`/api/auctions/${id}/photos`)).attach(
      'photos',
      Buffer.from('not-an-image'),
      { filename: 'notes.txt', contentType: 'text/plain' },
    );

    expect(response.status).toBe(400);
  });

  describe('GET /api/auctions (public browsing)', () => {
    it('lists published and sold auctions without requiring a session', async () => {
      const created = await withAuth(request(app).post('/api/auctions')).send(validBody);
      const id = body(created).auction?.id as string;
      await withAuth(request(app).patch(`/api/auctions/${id}`)).send({ status: 'published' });

      const response = await request(app).get('/api/auctions');

      expect(response.status).toBe(200);
      expect(body(response).auctions?.map((a) => a.id)).toEqual([id]);
    });

    it('does not list drafts', async () => {
      await withAuth(request(app).post('/api/auctions')).send(validBody);

      const response = await request(app).get('/api/auctions');

      expect(body(response).auctions).toEqual([]);
    });
  });

  describe('GET /api/auctions/:id (public detail)', () => {
    it('is visible to anyone once published', async () => {
      const created = await withAuth(request(app).post('/api/auctions')).send(validBody);
      const id = body(created).auction?.id as string;
      await withAuth(request(app).patch(`/api/auctions/${id}`)).send({ status: 'published' });

      const response = await request(app).get(`/api/auctions/${id}`);

      expect(response.status).toBe(200);
      expect(body(response).auction?.id).toBe(id);
      expect(body(response).serverTime).toEqual(expect.any(String));
    });

    it('404s a draft for a non-owner', async () => {
      const created = await withAuth(request(app).post('/api/auctions')).send(validBody);
      const id = body(created).auction?.id as string;

      const response = await request(app)
        .get(`/api/auctions/${id}`)
        .set('Cookie', authAndCsrfCookies('USR-2').cookieHeader);

      expect(response.status).toBe(404);
    });

    it('is visible to its owner while still a draft', async () => {
      const created = await withAuth(request(app).post('/api/auctions')).send(validBody);
      const id = body(created).auction?.id as string;

      const response = await request(app)
        .get(`/api/auctions/${id}`)
        .set('Cookie', authAndCsrfCookies('USR-1').cookieHeader);

      expect(response.status).toBe(200);
    });
  });

  describe('bidding', () => {
    async function publishAuction(): Promise<string> {
      const created = await withAuth(request(app).post('/api/auctions')).send(validBody);
      const id = body(created).auction?.id as string;
      await withAuth(request(app).patch(`/api/auctions/${id}`)).send({ status: 'published' });
      return id;
    }

    it('places a first bid at the starting price', async () => {
      const id = await publishAuction();

      const response = await withAuth(request(app).post(`/api/auctions/${id}/bids`), 'USR-2').send({
        amountCOP: '50000',
      });

      expect(response.status).toBe(201);
      expect(body(response).auction?.currentBidCOP).toBe(50_000);
      expect(body(response).bid?.amountCOP).toBe(50_000);
    });

    it('rejects the seller bidding on their own auction', async () => {
      const id = await publishAuction();

      const response = await withAuth(request(app).post(`/api/auctions/${id}/bids`), 'USR-1').send({
        amountCOP: '50000',
      });

      expect(response.status).toBe(403);
    });

    it('rejects a bid without a CSRF token', async () => {
      const id = await publishAuction();

      const response = await withSession(
        request(app).post(`/api/auctions/${id}/bids`),
        'USR-2',
      ).send({ amountCOP: '50000' });

      expect(response.status).toBe(403);
    });

    it('lists the bid history publicly, newest first', async () => {
      const id = await publishAuction();
      await withAuth(request(app).post(`/api/auctions/${id}/bids`), 'USR-2').send({
        amountCOP: '50000',
      });

      const response = await request(app).get(`/api/auctions/${id}/bids`);

      expect(response.status).toBe(200);
      expect(body(response).bids).toHaveLength(1);
      expect(body(response).bids?.[0]).toMatchObject({ bidderFirstName: 'Ana', amountCOP: 50_000 });
    });
  });

  describe('GET /api/auctions/purchases', () => {
    it('lists auctions won by the caller with a resolved handover', async () => {
      userRepository.seed(makeUser({ id: 'USR-2', phone: '3000000001', address: 'Calle 1' }));
      const id = await (async () => {
        const created = await withAuth(request(app).post('/api/auctions')).send({
          ...validBody,
          deliveryMethod: 'delivery',
        });
        const auctionId = body(created).auction?.id as string;
        await withAuth(request(app).patch(`/api/auctions/${auctionId}`)).send({
          status: 'published',
        });
        return auctionId;
      })();
      await withAuth(request(app).post(`/api/auctions/${id}/bids`), 'USR-2').send({
        amountCOP: '50000',
      });

      // Directly close the auction the same way the scheduler would.
      const auctionRepository = createJsonAuctionRepository(join(dataDir, 'auctions.json'));
      await auctionRepository.update(id, { status: 'sold', winnerUserId: 'USR-2' });

      const response = await request(app)
        .get('/api/auctions/purchases')
        .set('Cookie', authAndCsrfCookies('USR-2').cookieHeader);

      expect(response.status).toBe(200);
      expect(body(response).purchases).toHaveLength(1);
      expect(body(response).purchases?.[0]?.handover).toEqual({
        mode: 'delivery',
        address: 'Calle 1',
      });
    });

    it('returns 401 without a session', async () => {
      const response = await request(app).get('/api/auctions/purchases');
      expect(response.status).toBe(401);
    });
  });
});
