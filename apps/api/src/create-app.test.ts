import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { User } from './models/user.js';
import type { UserRepository } from './repositories/user.repository.js';
import { AuthService } from './services/auth.service.js';
import { createApp } from './create-app.js';
import { createAuthRateLimiter } from './middlewares/rate-limit.js';

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
}

describe('GET /health', () => {
  let app: Express;

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const userRepository = new FakeUserRepository();
    app = createApp(new AuthService(userRepository), userRepository);
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
    const userRepository = new FakeUserRepository();
    const limitedApp = createApp(
      new AuthService(userRepository),
      userRepository,
      createAuthRateLimiter({ windowMs: 60_000, max: 2 }),
    );

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
    const userRepository = new FakeUserRepository();
    return createApp(
      new AuthService(userRepository),
      userRepository,
      createAuthRateLimiter(),
      webDistPath,
    );
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
    const userRepository = new FakeUserRepository();
    const app = createApp(new AuthService(userRepository), userRepository);

    const response = await request(app).get('/register');

    expect(response.status).toBe(404);
  });
});
