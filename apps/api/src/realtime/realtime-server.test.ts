import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { REALTIME_PATH, type ServerMessage } from '@thrift-loop/shared';
import { signSessionToken } from '../lib/jwt.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { attachRealtime, type RealtimeHandle } from './realtime-server.js';

const WAIT_TIMEOUT_MS = 2000;

function waitForMessage(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out waiting for a message')),
      WAIT_TIMEOUT_MS,
    );
    ws.once('message', (data: Buffer) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()) as ServerMessage);
    });
  });
}

function connect(port: number, userId: string): WebSocket {
  const token = signSessionToken({ userId });
  return new WebSocket(`ws://127.0.0.1:${port}${REALTIME_PATH}`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
  });
}

describe('attachRealtime', () => {
  let server: http.Server;
  let realtime: RealtimeHandle;
  let port: number;

  beforeEach(async () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    server = http.createServer((_req, res) => res.end());
    realtime = attachRealtime(server, { allowedOrigins: [] });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    realtime.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllEnvs();
  });

  it('joins the auction room on subscribe-auction and receives a broadcast', async () => {
    const ws = connect(port, 'USR-1');
    await waitForMessage(ws);

    ws.send(JSON.stringify({ type: 'subscribe-auction', auctionId: 'AUC-1' }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    realtime.hub.broadcast('auction:AUC-1', { type: 'pong' });
    const message = await waitForMessage(ws);

    expect(message).toEqual({ type: 'pong' });
    ws.close();
  });

  it('stops receiving auction broadcasts after unsubscribe-auction', async () => {
    const ws = connect(port, 'USR-1');
    await waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'subscribe-auction', auctionId: 'AUC-1' }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    ws.send(JSON.stringify({ type: 'unsubscribe-auction', auctionId: 'AUC-1' }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(realtime.hub.viewerCount('AUC-1')).toBe(0);
    ws.close();
  });

  it('joins and leaves the grid room', async () => {
    const ws = connect(port, 'USR-1');
    await waitForMessage(ws);

    ws.send(JSON.stringify({ type: 'subscribe-grid' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    realtime.hub.broadcast('grid', { type: 'pong' });
    await expect(waitForMessage(ws)).resolves.toEqual({ type: 'pong' });

    ws.send(JSON.stringify({ type: 'unsubscribe-grid' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    realtime.hub.broadcast('grid', { type: 'pong' });
    await expect(waitForMessage(ws)).rejects.toThrow();

    ws.close();
  });

  it('replies pong to a ping', async () => {
    const ws = connect(port, 'USR-1');
    await waitForMessage(ws);

    ws.send(JSON.stringify({ type: 'ping' }));
    const message = await waitForMessage(ws);

    expect(message).toEqual({ type: 'pong' });
    ws.close();
  });

  it('sends an error for an invalid message', async () => {
    const ws = connect(port, 'USR-1');
    await waitForMessage(ws);

    ws.send('not json');
    const message = await waitForMessage(ws);

    expect(message).toEqual(expect.objectContaining({ type: 'error' }));
    ws.close();
  });

  it('closes the connection once the message rate limit is exceeded', async () => {
    const MESSAGES_OVER_LIMIT = 62;
    const ws = connect(port, 'USR-1');
    await waitForMessage(ws);

    const closePromise = new Promise<number>((resolve) => ws.once('close', resolve));
    for (let i = 0; i < MESSAGES_OVER_LIMIT; i += 1) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }

    const code = await closePromise;
    expect(code).toBe(1008);
  });

  it('ignores an upgrade for a different path', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/not-realtime`);
    const closed = await new Promise<boolean>((resolve) => {
      ws.once('close', () => resolve(true));
      ws.once('error', () => resolve(true));
      setTimeout(() => resolve(false), 300);
    });
    expect(closed).toBe(true);
  });

  it('close() terminates all open connections', async () => {
    const ws = connect(port, 'USR-1');
    await waitForMessage(ws);

    const closePromise = new Promise<void>((resolve) => ws.once('close', () => resolve()));
    realtime.close();

    await expect(closePromise).resolves.toBeUndefined();
  });
});
