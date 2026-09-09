import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request, { type Response as SupertestResponse } from 'supertest';
import express, { type Express, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { DEFAULT_NOTIFICATION_PREFERENCES, type PublicNotification } from '@thrift-loop/shared';
import { signSessionToken } from '../lib/jwt.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { attachCsrfCookie, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../lib/csrf.js';
import type { User } from '../models/user.js';
import type { UserPatch, UserRepository } from '../repositories/user.repository.js';
import type { Notification } from '../models/notification.js';
import type { NotificationRepository } from '../repositories/notification.repository.js';
import { createNotificationService } from '../services/notification.service.js';
import { createNotificationRouter } from './notification.routes.js';

interface NotificationResponseBody {
  notifications?: PublicNotification[];
  unreadCount?: number;
  notification?: PublicNotification;
  updated?: number;
  user?: { notificationPreferences?: Record<string, boolean> };
  error?: string;
  fields?: Record<string, string>;
}

function body(response: SupertestResponse): NotificationResponseBody {
  return response.body as NotificationResponseBody;
}

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

class FakeNotificationRepository implements NotificationRepository {
  readonly items: Notification[] = [];

  seed(notification: Notification): void {
    this.items.push(notification);
  }

  findByUserId(userId: string, limit: number): Promise<Notification[]> {
    return Promise.resolve(
      this.items
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    );
  }

  countUnread(userId: string): Promise<number> {
    return Promise.resolve(
      this.items.filter((n) => n.userId === userId && n.readAt === null).length,
    );
  }

  save(notification: Notification): Promise<void> {
    this.items.push(notification);
    return Promise.resolve();
  }

  saveMany(notifications: readonly Notification[]): Promise<void> {
    this.items.push(...notifications);
    return Promise.resolve();
  }

  markRead(userId: string, id: string): Promise<Notification | null> {
    const index = this.items.findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) {
      return Promise.resolve(null);
    }
    // index comes from findIndex, a bounded array position, not attacker input.
    // eslint-disable-next-line security/detect-object-injection
    const existing = this.items[index] as Notification;
    const updated = { ...existing, readAt: new Date().toISOString() };
    // eslint-disable-next-line security/detect-object-injection
    this.items[index] = updated;
    return Promise.resolve(updated);
  }

  markAllRead(userId: string): Promise<number> {
    let count = 0;
    for (let i = 0; i < this.items.length; i += 1) {
      // i is a bounded loop counter, not attacker input.
      // eslint-disable-next-line security/detect-object-injection
      const item = this.items[i] as Notification;
      if (item.userId === userId && item.readAt === null) {
        // eslint-disable-next-line security/detect-object-injection
        this.items[i] = { ...item, readAt: new Date().toISOString() };
        count += 1;
      }
    }
    return Promise.resolve(count);
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
    categoryPreference: null,
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'NTF-1',
    userId: 'USR-1',
    type: 'outbid',
    auctionId: 'AUC-1',
    auctionTitle: 'Chaqueta de cuero',
    amountCOP: 60_000,
    actorFirstName: 'Bea',
    readAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

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

function withAuth(req: request.Test, userId = 'USR-1'): request.Test {
  const { cookieHeader, csrfToken } = authAndCsrfCookies(userId);
  return req.set('Cookie', cookieHeader).set(CSRF_HEADER_NAME, csrfToken);
}

function authCookieOnly(req: request.Test, userId = 'USR-1'): request.Test {
  return req.set('Cookie', `${SESSION_COOKIE_NAME}=${signSessionToken({ userId })}`);
}

describe('notification routes', () => {
  let app: Express;
  let notificationRepository: FakeNotificationRepository;
  let userRepository: FakeUserRepository;

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    notificationRepository = new FakeNotificationRepository();
    userRepository = new FakeUserRepository();
    userRepository.seed(makeUser({ id: 'USR-1' }));
    userRepository.seed(makeUser({ id: 'USR-2' }));
    const notificationService = createNotificationService(notificationRepository, userRepository);

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/notifications', createNotificationRouter(notificationService));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('GET /', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get('/api/notifications');
      expect(response.status).toBe(401);
    });

    it('returns the user notifications and unread count', async () => {
      notificationRepository.seed(makeNotification({ id: 'NTF-1', userId: 'USR-1' }));
      notificationRepository.seed(makeNotification({ id: 'NTF-2', userId: 'USR-2' }));

      const response = await authCookieOnly(request(app).get('/api/notifications'));

      expect(response.status).toBe(200);
      expect(body(response).notifications).toEqual([expect.objectContaining({ id: 'NTF-1' })]);
      expect(body(response).unreadCount).toBe(1);
    });
  });

  describe('POST /:id/read', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).post('/api/notifications/NTF-1/read');
      expect(response.status).toBe(401);
    });

    it('rejects a request without a CSRF token', async () => {
      notificationRepository.seed(makeNotification({ id: 'NTF-1', userId: 'USR-1' }));
      const response = await authCookieOnly(request(app).post('/api/notifications/NTF-1/read'));
      expect(response.status).toBe(403);
    });

    it('marks a notification read', async () => {
      notificationRepository.seed(makeNotification({ id: 'NTF-1', userId: 'USR-1' }));

      const response = await withAuth(request(app).post('/api/notifications/NTF-1/read'));

      expect(response.status).toBe(200);
      expect(body(response).notification?.readAt).not.toBeNull();
    });

    it('returns 404 for another user notification', async () => {
      notificationRepository.seed(makeNotification({ id: 'NTF-1', userId: 'USR-2' }));

      const response = await withAuth(request(app).post('/api/notifications/NTF-1/read'));

      expect(response.status).toBe(404);
    });
  });

  describe('POST /read-all', () => {
    it('marks every unread notification for the user read', async () => {
      notificationRepository.seed(makeNotification({ id: 'NTF-1', userId: 'USR-1' }));
      notificationRepository.seed(makeNotification({ id: 'NTF-2', userId: 'USR-1' }));

      const response = await withAuth(request(app).post('/api/notifications/read-all'));

      expect(response.status).toBe(200);
      expect(body(response).updated).toBe(2);
    });
  });

  describe('PATCH /preferences', () => {
    it('rejects a non-boolean body', async () => {
      const response = await withAuth(
        request(app).patch('/api/notifications/preferences').send({ outbid: 'false' }),
      );

      expect(response.status).toBe(400);
    });

    it('updates the given preference', async () => {
      const response = await withAuth(
        request(app).patch('/api/notifications/preferences').send({ outbid: false }),
      );

      expect(response.status).toBe(200);
      expect(body(response).user?.notificationPreferences).toEqual({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        outbid: false,
      });
    });
  });
});
