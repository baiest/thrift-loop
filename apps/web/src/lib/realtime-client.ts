import { REALTIME_PATH, type ClientMessage, type ServerMessage } from '@thrift-loop/shared';

const SOCKET_OPEN = 1;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;
const POLICY_VIOLATION_CLOSE_CODE = 1008;
const AUTH_REQUIRED_CLOSE_CODE = 4401;
const AUTH_CLOSE_CODES = new Set([POLICY_VIOLATION_CLOSE_CODE, AUTH_REQUIRED_CLOSE_CODE]);

export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'reconnecting';

export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  onerror: (() => void) | null;
}

export interface RealtimeClientOptions {
  url?: string;
  socketFactory?: (url: string) => WebSocketLike;
}

export interface RealtimeClient {
  connect(): void;
  disconnect(): void;
  send(message: ClientMessage): void;
  onMessage(listener: (message: ServerMessage) => void): () => void;
  onStatusChange(listener: (status: RealtimeStatus) => void): () => void;
}

function isSubscription(message: ClientMessage): boolean {
  return message.type === 'subscribe-auction' || message.type === 'subscribe-grid';
}

function subscriptionKey(message: ClientMessage): string | null {
  switch (message.type) {
    case 'subscribe-auction':
    case 'unsubscribe-auction':
      return `auction:${message.auctionId}`;
    case 'subscribe-grid':
    case 'unsubscribe-grid':
      return 'grid';
    default:
      return null;
  }
}

function defaultSocketFactory(url: string): WebSocketLike {
  return new WebSocket(url) as unknown as WebSocketLike;
}

export function createRealtimeClient(options: RealtimeClientOptions = {}): RealtimeClient {
  const url = options.url ?? REALTIME_PATH;
  const socketFactory = options.socketFactory ?? defaultSocketFactory;

  let socket: WebSocketLike | null = null;
  let status: RealtimeStatus = 'idle';
  let attempt = 0;
  let explicitlyDisconnected = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSends: string[] = [];
  const subscriptions = new Map<string, string>();
  const messageListeners = new Set<(message: ServerMessage) => void>();
  const statusListeners = new Set<(status: RealtimeStatus) => void>();

  function setStatus(next: RealtimeStatus): void {
    status = next;
    for (const listener of statusListeners) {
      listener(next);
    }
  }

  function flushPending(): void {
    if (!socket || socket.readyState !== SOCKET_OPEN) {
      return;
    }
    for (const raw of pendingSends) {
      socket.send(raw);
    }
    pendingSends = [];
  }

  function resubscribe(): void {
    if (!socket) {
      return;
    }
    for (const raw of subscriptions.values()) {
      socket.send(raw);
    }
  }

  function scheduleReconnect(): void {
    if (explicitlyDisconnected) {
      return;
    }
    setStatus('reconnecting');
    const delay = Math.min(RECONNECT_BASE_MS * BACKOFF_MULTIPLIER ** attempt, RECONNECT_MAX_MS);
    attempt += 1;
    reconnectTimer = setTimeout(connectSocket, delay);
  }

  function connectSocket(): void {
    explicitlyDisconnected = false;
    setStatus(attempt === 0 ? 'connecting' : 'reconnecting');
    const ws = socketFactory(url);
    socket = ws;

    ws.onopen = () => {
      attempt = 0;
      setStatus('open');
      resubscribe();
      flushPending();
    };
    ws.onmessage = (event) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }
      for (const listener of messageListeners) {
        listener(message);
      }
    };
    ws.onclose = (event) => {
      socket = null;
      if (AUTH_CLOSE_CODES.has(event.code)) {
        explicitlyDisconnected = true;
        setStatus('idle');
        return;
      }
      scheduleReconnect();
    };
    ws.onerror = () => undefined;
  }

  return {
    connect() {
      if (status !== 'idle') {
        return;
      }
      connectSocket();
    },

    disconnect() {
      explicitlyDisconnected = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      socket = null;
      setStatus('idle');
    },

    send(message) {
      const raw = JSON.stringify(message);
      const key = subscriptionKey(message);

      if (key) {
        // Subscription state lives only in the map; resubscribe() is what
        // delivers it (now if already open, or on the next open otherwise) —
        // queuing it in pendingSends too would double-send it on open.
        if (isSubscription(message)) {
          subscriptions.set(key, raw);
        } else {
          subscriptions.delete(key);
        }
        if (socket && socket.readyState === SOCKET_OPEN) {
          socket.send(raw);
        }
        return;
      }

      if (socket && socket.readyState === SOCKET_OPEN) {
        socket.send(raw);
      } else {
        pendingSends.push(raw);
      }
    },

    onMessage(listener) {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },

    onStatusChange(listener) {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
  };
}

let sharedClient: RealtimeClient | null = null;

/** One socket for the whole app: every consumer (the connection organism,
 * per-auction hooks) calls this instead of createRealtimeClient directly. */
export function getSharedRealtimeClient(): RealtimeClient {
  sharedClient ??= createRealtimeClient();
  return sharedClient;
}
