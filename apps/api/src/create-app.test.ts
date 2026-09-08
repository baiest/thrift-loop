import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { User } from './models/user.js';
import type { Auction } from './models/auction.js';
import type { UserPatch, UserRepository } from './repositories/user.repository.js';
import type { AuctionPatch, AuctionRepository } from './repositories/auction.repository.js';
import { createAuthService } from './services/auth.service.js';
import { createAuctionService } from './services/auction.service.js';
import { createApp, type CreateAppOptions } from './create-app.js';
import { createRateLimiter } from './middlewares/rate-limit.js';
import { signSessionToken } from './lib/jwt.js';
import { SESSION_COOKIE_NAME } from './lib/cookies.js';

class FakeUserRepository implements UserRepository {
  findByPhone(): Promise<User | null> {
    return Promise.resolve(null);
  }

  findById(): Promise<User | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  update(_id: string, _patch: UserPatch): Promise<User | null> {
    return Promise.resolve(null);
  }
}

class FakeAuctionRepository implements AuctionRepository {
  private readonly auctions = new Map<string, Auction>();

  findById(id: string): Promise<Auction | null> {
    return Promise.resolve(this.auctions.get(id) ?? null);
  }

  findByUserId(userId: string): Promise<Auction[]> {
    return Promise.resolve([...this.auctions.values()].filter((a) => a.userId === userId));
  }

  findDueForPublish(): Promise<Auction[]> {
    return Promise.resolve([]);
  }

  findAllPublished(): Promise<Auction[]> {
    return Promise.resolve([]);
  }

  findDueForClose(): Promise<Auction[]> {
    return Promise.resolve([]);
  }

  findWonByUserId(): Promise<Auction[]> {
    return Promise.resolve([]);
  }

  save(auction: Auction): Promise<void> {
    this.auctions.set(auction.id, auction);
    return Promise.resolve();
  }

  update(_id: string, _patch: AuctionPatch): Promise<Auction | null> {
    return Promise.resolve(null);
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  addPhotoKeys(): Promise<Auction | null> {
    return Promise.resolve(null);
  }
}

class NoopPhotoStorage {
  savePhotos(): Promise<string[]> {
    return Promise.resolve([]);
  }

  deletePhotosForAuction(): Promise<void> {
    return Promise.resolve();
  }
}

function baseOptions(userRepository: UserRepository): CreateAppOptions {
  return { authService: createAuthService(userRepository), userRepository };
}

describe('GET /health', () => {
  let app: Express;

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    app = createApp(baseOptions(new FakeUserRepository()));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns ok status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('/api/auth rate limiting', () => {
  it('returns 429 once the configured limit is exceeded', async () => {
    const limitedApp = createApp({
      ...baseOptions(new FakeUserRepository()),
      authRateLimiter: createRateLimiter({ windowMs: 60_000, max: 2 }),
    });

    await request(limitedApp).post('/api/auth/login').send({});
    await request(limitedApp).post('/api/auth/login').send({});
    const third = await request(limitedApp).post('/api/auth/login').send({});

    expect(third.status).toBe(429);
  });
});

describe('single-origin static serving', () => {
  let webDistPath: string;

  beforeEach(async () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    webDistPath = await mkdtemp(join(tmpdir(), 'thrift-loop-web-dist-'));
    // Path is built from mkdtemp's own return value, not attacker-controlled input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(join(webDistPath, 'index.html'), '<!doctype html><title>app shell</title>');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(webDistPath, { recursive: true, force: true });
  });

  function buildAppWithDist(): Express {
    return createApp({ ...baseOptions(new FakeUserRepository()), webDistPath });
  }

  it('serves the app shell for a non-API GET route', async () => {
    const response = await request(buildAppWithDist()).get('/register');

    expect(response.status).toBe(200);
    expect(response.text).toContain('app shell');
  });

  it('still serves /api routes as JSON, not the app shell', async () => {
    const response = await request(buildAppWithDist()).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.headers['content-type']).toContain('application/json');
  });

  it('does not serve static files when webDistPath is omitted', async () => {
    const app = createApp(baseOptions(new FakeUserRepository()));

    const response = await request(app).get('/register');

    expect(response.status).toBe(404);
  });
});

describe('auction wiring', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('mounts /api/auctions when an auction service is provided', async () => {
    const userRepository = new FakeUserRepository();
    const auctionRepository = new FakeAuctionRepository();
    const auctionService = createAuctionService(
      auctionRepository,
      new NoopPhotoStorage(),
      userRepository,
    );
    const app = createApp({ ...baseOptions(userRepository), auctionService });

    const cookie = `${SESSION_COOKIE_NAME}=${signSessionToken({ userId: 'USR-1' })}`;
    const response = await request(app).get('/api/auctions/mine').set('Cookie', cookie);

    expect(response.status).toBe(200);
  });

  it('does not mount /api/auctions when no auction service is provided', async () => {
    const app = createApp(baseOptions(new FakeUserRepository()));

    const response = await request(app).get('/api/auctions/mine');

    expect(response.status).toBe(404);
  });

  it('serves uploaded files as static assets when uploadsDir is provided', async () => {
    const uploadsDir = await mkdtemp(join(tmpdir(), 'thrift-loop-uploads-'));
    // Paths are built from mkdtemp's own return value, not attacker-controlled input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await mkdir(join(uploadsDir, 'USR-1', 'AUC-1'), { recursive: true });
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(join(uploadsDir, 'USR-1', 'AUC-1', 'photo.jpg'), 'fake-bytes');

    const userRepository = new FakeUserRepository();
    const auctionRepository = new FakeAuctionRepository();
    const auctionService = createAuctionService(
      auctionRepository,
      new NoopPhotoStorage(),
      userRepository,
    );
    const app = createApp({ ...baseOptions(userRepository), auctionService, uploadsDir });

    const response = await request(app).get('/uploads/USR-1/AUC-1/photo.jpg');

    expect(response.status).toBe(200);
    await rm(uploadsDir, { recursive: true, force: true });
  });
});
