import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerMessage } from '@thrift-loop/shared';
import { createRealtimeClient, type WebSocketLike } from './realtime-client.js';

const OPEN = 1;
const CONNECTING = 0;
const CLOSED = 3;

class FakeWebSocket implements WebSocketLike {
  static readonly instances: FakeWebSocket[] = [];

  readyState = CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number): void {
    this.readyState = CLOSED;
    this.onclose?.({ code: code ?? 1000 });
  }

  open(): void {
    this.readyState = OPEN;
    this.onopen?.();
  }

  receive(message: ServerMessage): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  serverClose(code: number): void {
    this.readyState = CLOSED;
    this.onclose?.({ code });
  }
}

function socketFactory(url: string): WebSocketLike {
  return new FakeWebSocket(url);
}

function latestSocket(): FakeWebSocket {
  return FakeWebSocket.instances[FakeWebSocket.instances.length - 1] as FakeWebSocket;
}

describe('createRealtimeClient', () => {
  beforeEach(() => {
    FakeWebSocket.instances.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('connects to the given url via the socket factory', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    client.connect();

    expect(latestSocket().url).toBe('/api/realtime');
  });

  it('reports status transitions from connecting to open', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    const statuses: string[] = [];
    client.onStatusChange((status) => statuses.push(status));

    client.connect();
    expect(statuses).toEqual(['connecting']);

    latestSocket().open();
    expect(statuses).toEqual(['connecting', 'open']);
  });

  it('delivers parsed server messages to listeners', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    const received: ServerMessage[] = [];
    client.onMessage((message) => received.push(message));

    client.connect();
    latestSocket().open();
    latestSocket().receive({ type: 'pong' });

    expect(received).toEqual([{ type: 'pong' }]);
  });

  it('buffers a send made before the socket is open and flushes it on open', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    client.connect();
    client.send({ type: 'ping' });

    expect(latestSocket().sent).toEqual([]);

    latestSocket().open();

    expect(latestSocket().sent).toEqual([JSON.stringify({ type: 'ping' })]);
  });

  it('sends immediately once the socket is already open', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    client.connect();
    latestSocket().open();

    client.send({ type: 'ping' });

    expect(latestSocket().sent).toEqual([JSON.stringify({ type: 'ping' })]);
  });

  it('replays subscriptions on reconnect', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    client.connect();
    latestSocket().open();
    client.send({ type: 'subscribe-auction', auctionId: 'AUC-1' });
    latestSocket().sent = [];

    latestSocket().serverClose(1006);
    vi.advanceTimersByTime(30_000);
    latestSocket().open();

    expect(latestSocket().sent).toEqual([
      JSON.stringify({ type: 'subscribe-auction', auctionId: 'AUC-1' }),
    ]);
  });

  it('does not replay a subscription that was later unsubscribed', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    client.connect();
    latestSocket().open();
    client.send({ type: 'subscribe-auction', auctionId: 'AUC-1' });
    client.send({ type: 'unsubscribe-auction', auctionId: 'AUC-1' });

    latestSocket().serverClose(1006);
    vi.advanceTimersByTime(30_000);
    latestSocket().open();

    expect(latestSocket().sent).toEqual([]);
  });

  it('reconnects with exponential backoff after an unexpected close', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    client.connect();
    latestSocket().open();

    latestSocket().serverClose(1006);
    expect(FakeWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('resets the backoff attempt counter after a successful reconnect', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    client.connect();
    latestSocket().open();

    latestSocket().serverClose(1006);
    vi.advanceTimersByTime(1000);
    latestSocket().open();
    latestSocket().serverClose(1006);

    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('does not reconnect after an explicit disconnect', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    client.connect();
    latestSocket().open();

    client.disconnect();
    vi.advanceTimersByTime(60_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('does not reconnect after an auth-shaped close code', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    client.connect();
    latestSocket().open();

    latestSocket().serverClose(1008);
    vi.advanceTimersByTime(60_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('sets status to idle after an auth-shaped close', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    const statuses: string[] = [];
    client.onStatusChange((status) => statuses.push(status));
    client.connect();
    latestSocket().open();

    latestSocket().serverClose(1008);

    expect(statuses[statuses.length - 1]).toBe('idle');
  });

  it('stops delivering messages once unsubscribed', () => {
    const client = createRealtimeClient({ url: '/api/realtime', socketFactory });
    const received: ServerMessage[] = [];
    const unsubscribe = client.onMessage((message) => received.push(message));

    client.connect();
    latestSocket().open();
    unsubscribe();
    latestSocket().receive({ type: 'pong' });

    expect(received).toEqual([]);
  });
});
