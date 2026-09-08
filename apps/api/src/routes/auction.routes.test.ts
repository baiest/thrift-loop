import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request, { type Response as SupertestResponse } from 'supertest';
import express, { type Express, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import type { PublicAuction } from '@thrift-loop/shared';
import { signSessionToken } from '../lib/jwt.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { attachCsrfCookie, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../lib/csrf.js';
import { createJsonAuctionRepository } from '../repositories/auction.repository.json.js';
import { createLocalPhotoStorage } from '../lib/photo-storage.js';
import { createAuctionService } from '../services/auction.service.js';
import { createAuctionRouter } from './auction.routes.js';

interface AuctionResponseBody {
  auction?: PublicAuction;
  auctions?: PublicAuction[];
  error?: string;
  fields?: Record<string, string>;
}

function body(response: SupertestResponse): AuctionResponseBody {
  return response.body as AuctionResponseBody;
}

const validBody = {
  category: 'jeans',
  condition: 'good',
  deliveryMethod: 'pickup',
  priceCOP: '50000',
  publishAt: '',
};

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

describe('auction routes', () => {
  let app: Express;
  let dataDir: string;

  beforeEach(async () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    dataDir = await mkdtemp(join(tmpdir(), 'thrift-loop-auction-routes-'));
    const auctionRepository = createJsonAuctionRepository(join(dataDir, 'auctions.json'));
    const photoStorage = createLocalPhotoStorage(join(dataDir, 'uploads'));
    const auctionService = createAuctionService(auctionRepository, photoStorage);

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auctions', createAuctionRouter(auctionService));
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
    const response = await request(app)
      .post('/api/auctions')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${signSessionToken({ userId: 'USR-1' })}`)
      .send(validBody);

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

    const getResponse = await request(app)
      .get(`/api/auctions/${id}`)
      .set('Cookie', authAndCsrfCookies().cookieHeader);
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
});
