import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request, { type Response } from 'supertest';
import type { Express } from 'express';
import type { PublicUser } from '@thrift-loop/shared';
import type { User } from '../models/user.js';
import type { UserRepository } from '../repositories/user.repository.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { signSessionToken } from '../lib/jwt.js';
import { AuthService } from '../services/auth.service.js';
import { createApp } from '../create-app.js';

interface AuthResponseBody {
  user?: PublicUser;
  error?: string;
  fields?: Record<string, string>;
}

function body(response: Response): AuthResponseBody {
  return response.body as AuthResponseBody;
}

class FakeUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  findByPhone(phone: string): Promise<User | null> {
    return Promise.resolve(this.users.get(phone) ?? null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve([...this.users.values()].find((user) => user.id === id) ?? null);
  }

  save(user: User): Promise<void> {
    this.users.set(user.phone, user);
    return Promise.resolve();
  }
}

const registerBody = {
  phone: '3001234567',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  password: 'Abcdefg1',
  confirmPassword: 'Abcdefg1',
};

function buildApp(): Express {
  const userRepository = new FakeUserRepository();
  const authService = new AuthService(userRepository);
  return createApp(authService, userRepository, 'http://localhost:5173');
}

describe('auth routes', () => {
  let app: Express;

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    app = buildApp();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('POST /auth/register', () => {
    it('returns 201, the public user, and an httpOnly session cookie', async () => {
      const response = await request(app).post('/auth/register').send(registerBody);

      expect(response.status).toBe(201);
      expect(body(response).user).toMatchObject({ firstName: 'Ana', lastName: 'Gómez' });
      expect(
        (body(response).user as unknown as Record<string, unknown>)['passwordHash'],
      ).toBeUndefined();

      const cookieHeader = response.headers['set-cookie']?.[0] ?? '';
      expect(cookieHeader).toContain('session=');
      expect(cookieHeader).toContain('HttpOnly');
    });

    it('returns 400 with field errors for an invalid submission', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ ...registerBody, phone: 'not-a-phone' });

      expect(response.status).toBe(400);
      expect(body(response).fields?.['phone']).toEqual(expect.any(String));
    });

    it('returns 409 for a duplicate phone number', async () => {
      await request(app).post('/auth/register').send(registerBody);
      const response = await request(app).post('/auth/register').send(registerBody);

      expect(response.status).toBe(409);
    });

    it('returns 500 for an unexpected error without crashing', async () => {
      const brokenRepository: UserRepository = {
        findByPhone: () => Promise.reject(new Error('database is down')),
        findById: () => Promise.resolve(null),
        save: () => Promise.resolve(),
      };
      const brokenApp = createApp(
        new AuthService(brokenRepository),
        brokenRepository,
        'http://localhost:5173',
      );

      const response = await request(brokenApp).post('/auth/register').send(registerBody);

      expect(response.status).toBe(500);
      expect(body(response).error).toBe('Something went wrong');
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 and sets the session cookie for correct credentials', async () => {
      await request(app).post('/auth/register').send(registerBody);

      const response = await request(app)
        .post('/auth/login')
        .send({ phone: registerBody.phone, password: registerBody.password });

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']?.[0]).toContain('session=');
    });

    it('returns 401 with a generic message for wrong credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ phone: '3009999999', password: 'whatever1A' });

      expect(response.status).toBe(401);
      expect(body(response).error).toBe('Phone number or password is incorrect');
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 without a session cookie', async () => {
      const response = await request(app).get('/auth/me');
      expect(response.status).toBe(401);
    });

    it('returns the current user with a valid session cookie', async () => {
      const agent = request.agent(app);
      await agent.post('/auth/register').send(registerBody);

      const response = await agent.get('/auth/me');

      expect(response.status).toBe(200);
      expect(body(response).user).toMatchObject({ firstName: 'Ana' });
    });

    it('returns 401 when the token is valid but the user no longer exists', async () => {
      const token = signSessionToken({ userId: 'deleted-user' });

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the session cookie', async () => {
      const agent = request.agent(app);
      await agent.post('/auth/register').send(registerBody);

      const response = await agent.post('/auth/logout');

      expect(response.status).toBe(204);
      const meResponse = await agent.get('/auth/me');
      expect(meResponse.status).toBe(401);
    });
  });
});
