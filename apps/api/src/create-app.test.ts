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
    app = createApp(new AuthService(userRepository), userRepository, 'http://localhost:5173');
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

describe('/auth rate limiting', () => {
  it('returns 429 once the configured limit is exceeded', async () => {
    const userRepository = new FakeUserRepository();
    const limitedApp = createApp(
      new AuthService(userRepository),
      userRepository,
      'http://localhost:5173',
      createAuthRateLimiter({ windowMs: 60_000, max: 2 }),
    );

    await request(limitedApp).post('/auth/login').send({});
    await request(limitedApp).post('/auth/login').send({});
    const third = await request(limitedApp).post('/auth/login').send({});

    expect(third.status).toBe(429);
  });
});
