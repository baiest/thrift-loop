import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { WebSocket } from 'ws';
import { REALTIME_PATH, type ServerMessage } from '@thrift-loop/shared';
import type { User } from './models/user.js';
import type { UserPatch, UserRepository } from './repositories/user.repository.js';
import { createAuthService } from './services/auth.service.js';
import { signSessionToken } from './lib/jwt.js';
import { SESSION_COOKIE_NAME } from './lib/cookies.js';
import { createEventBus } from './lib/event-bus.js';
import type { NotificationService } from './services/notification.service.js';
import { createServer, type RunningServer } from './create-server.js';

const WAIT_TIMEOUT_MS = 2000;

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

function waitForEvent<T = unknown>(emitter: WebSocket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}"`)),
      WAIT_TIMEOUT_MS,
    );
    emitter.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe('createServer realtime integration', () => {
  let running: RunningServer;
  let port: number;

  beforeEach(async () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    running = createServer({
      authService: createAuthService(new FakeUserRepository()),
      userRepository: new FakeUserRepository(),
      allowedOrigins: [],
    });
    await new Promise<void>((resolve) => {
      running.server.listen(0, resolve);
    });
    port = (running.server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await running.close();
    vi.unstubAllEnvs();
  });

  it('sends a ready message for an authenticated upgrade', async () => {
    const token = signSessionToken({ userId: 'USR-1' });
    const ws = new WebSocket(`ws://127.0.0.1:${port}${REALTIME_PATH}`, {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });

    const raw = await waitForEvent<Buffer>(ws, 'message');
    const message = JSON.parse(raw.toString()) as ServerMessage;

    expect(message).toEqual(expect.objectContaining({ type: 'ready', userId: 'USR-1' }));
    ws.close();
  });

  it('rejects an upgrade with no session cookie', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${REALTIME_PATH}`);

    const error = await waitForEvent(ws, 'error').catch(() => null);
    const unexpectedResponse = await waitForEvent(ws, 'unexpected-response').catch(() => null);

    expect(error !== null || unexpectedResponse !== null).toBe(true);
  });
});

describe('createServer with event fanout wired', () => {
  it('attaches event-fanout and cleans it up on close without throwing', async () => {
    const eventBus = createEventBus();
    const notificationService: NotificationService = {
      recordForEvent: vi.fn(),
      recordForEventWithRecipients: vi.fn().mockResolvedValue([]),
      list: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      updatePreferences: vi.fn(),
    };
    const running = createServer({
      authService: createAuthService(new FakeUserRepository()),
      userRepository: new FakeUserRepository(),
      allowedOrigins: [],
      eventBus,
      notificationService,
    });
    await new Promise<void>((resolve) => running.server.listen(0, resolve));

    eventBus.publish({
      type: 'auction-closed',
      auctionId: 'AUC-1',
      auctionTitle: 'Chaqueta',
      ownerUserId: 'USR-owner',
      winnerUserId: 'USR-winner',
      finalPriceCOP: 60_000,
      occurredAt: '2026-01-01T00:00:00.000Z',
    });
    await vi.waitFor(() => {
      expect(notificationService.recordForEventWithRecipients).toHaveBeenCalled();
    });

    await expect(running.close()).resolves.toBeUndefined();
  });

  it('mounts the notifications route on the app HTTP server, not just the socket', async () => {
    const notificationService: NotificationService = {
      recordForEvent: vi.fn(),
      recordForEventWithRecipients: vi.fn().mockResolvedValue([]),
      list: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      updatePreferences: vi.fn(),
    };
    const running = createServer({
      authService: createAuthService(new FakeUserRepository()),
      userRepository: new FakeUserRepository(),
      allowedOrigins: [],
      eventBus: createEventBus(),
      notificationService,
    });
    await new Promise<void>((resolve) => running.server.listen(0, resolve));

    const response = await request(running.server).get('/api/notifications');

    expect(response.status).not.toBe(404);
    await running.close();
  });
});
