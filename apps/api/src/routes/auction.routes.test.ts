import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request, { type Response } from 'supertest';
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import type { PublicAuction } from '@thrift-loop/shared';
import { signSessionToken } from '../lib/jwt.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
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

function body(response: Response): AuctionResponseBody {
  return response.body as AuctionResponseBody;
}

const validBody = {
  category: 'jeans',
  condition: 'good',
  deliveryMethod: 'pickup',
  priceCOP: '50000',
  publishAt: '',
};

function authCookie(): string {
  const token = signSessionToken({ userId: 'USR-1' });
  return `${SESSION_COOKIE_NAME}=${token}`;
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

  it('creates a draft auction for the authenticated user', async () => {
    const response = await request(app)
      .post('/api/auctions')
      .set('Cookie', authCookie())
      .send(validBody);

    expect(response.status).toBe(201);
    expect(body(response).auction).toMatchObject({ status: 'draft', category: 'jeans' });
  });

  it('returns 400 with field errors for an invalid submission', async () => {
    const response = await request(app)
      .post('/api/auctions')
      .set('Cookie', authCookie())
      .send({ ...validBody, category: 'hats' });

    expect(response.status).toBe(400);
    expect(body(response).fields?.['category']).toEqual(expect.any(String));
  });

  it('patches a draft auction with only the given fields', async () => {
    const created = await request(app)
      .post('/api/auctions')
      .set('Cookie', authCookie())
      .send(validBody);
    const createdId = body(created).auction?.id;

    const response = await request(app)
      .patch(`/api/auctions/${createdId}`)
      .set('Cookie', authCookie())
      .send({ priceCOP: '75000' });

    expect(response.status).toBe(200);
    expect(body(response).auction?.priceCOP).toBe(75_000);
    expect(body(response).auction?.category).toBe('jeans');
  });

  it('publishes via PATCH and then rejects further edits', async () => {
    const created = await request(app)
      .post('/api/auctions')
      .set('Cookie', authCookie())
      .send(validBody);
    const id = body(created).auction?.id as string;

    const published = await request(app)
      .patch(`/api/auctions/${id}`)
      .set('Cookie', authCookie())
      .send({ status: 'published' });
    expect(body(published).auction?.status).toBe('published');

    const secondEdit = await request(app)
      .patch(`/api/auctions/${id}`)
      .set('Cookie', authCookie())
      .send({ priceCOP: '1' });
    expect(secondEdit.status).toBe(409);
  });

  it('deletes an auction', async () => {
    const created = await request(app)
      .post('/api/auctions')
      .set('Cookie', authCookie())
      .send(validBody);
    const id = body(created).auction?.id as string;

    const response = await request(app).delete(`/api/auctions/${id}`).set('Cookie', authCookie());
    expect(response.status).toBe(204);

    const getResponse = await request(app).get(`/api/auctions/${id}`).set('Cookie', authCookie());
    expect(getResponse.status).toBe(404);
  });

  it('lists only the caller own auctions', async () => {
    await request(app).post('/api/auctions').set('Cookie', authCookie()).send(validBody);

    const otherCookie = `${SESSION_COOKIE_NAME}=${signSessionToken({ userId: 'USR-2' })}`;
    await request(app).post('/api/auctions').set('Cookie', otherCookie).send(validBody);

    const response = await request(app).get('/api/auctions/mine').set('Cookie', authCookie());

    expect(body(response).auctions).toHaveLength(1);
  });

  it('uploads photos and returns their urls on the auction', async () => {
    const created = await request(app)
      .post('/api/auctions')
      .set('Cookie', authCookie())
      .send(validBody);
    const id = body(created).auction?.id as string;

    const response = await request(app)
      .post(`/api/auctions/${id}/photos`)
      .set('Cookie', authCookie())
      .attach('photos', Buffer.from('fake-jpeg-bytes'), {
        filename: 'front.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(200);
    expect(body(response).auction?.photoUrls).toHaveLength(1);
    expect(body(response).auction?.photoUrls[0]).toContain('/uploads/');
  });

  it('rejects a disallowed file type', async () => {
    const created = await request(app)
      .post('/api/auctions')
      .set('Cookie', authCookie())
      .send(validBody);
    const id = body(created).auction?.id as string;

    const response = await request(app)
      .post(`/api/auctions/${id}/photos`)
      .set('Cookie', authCookie())
      .attach('photos', Buffer.from('not-an-image'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
  });
});
