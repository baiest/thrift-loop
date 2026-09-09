import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { parseClientMessage, REALTIME_PATH, type ServerMessage } from '@thrift-loop/shared';
import { authenticateUpgrade } from './authenticate-upgrade.js';
import {
  createRealtimeHub,
  type Connection,
  type RealtimeHub,
  type SocketLike,
} from './realtime-hub.js';

const HEARTBEAT_MS = 30_000;
const MAX_PAYLOAD_BYTES = 4096;
const MAX_MESSAGES_PER_WINDOW = 60;
const RATE_WINDOW_MS = 10_000;
const HTTP_UNAUTHORIZED_RESPONSE = 'HTTP/1.1 401 Unauthorized\r\n\r\n';
const POLICY_VIOLATION_CLOSE_CODE = 1008;
const INVALID_MESSAGE = 'Invalid message';
const RATE_LIMIT_EXCEEDED = 'Rate limit exceeded';

export interface RealtimeOptions {
  allowedOrigins: readonly string[];
}

export interface RealtimeHandle {
  hub: RealtimeHub;
  close: () => void;
}

interface TrackedSocket extends WebSocket {
  isAlive?: boolean;
  messageCount?: number;
}

function toSocketLike(ws: WebSocket): SocketLike {
  return {
    send: (data) => ws.send(data),
    close: () => ws.close(),
  };
}

function send(ws: WebSocket, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

function handleClientMessage(
  hub: RealtimeHub,
  connection: Connection,
  ws: TrackedSocket,
  raw: string,
): void {
  ws.messageCount = (ws.messageCount ?? 0) + 1;
  if (ws.messageCount > MAX_MESSAGES_PER_WINDOW) {
    send(ws, { type: 'error', message: RATE_LIMIT_EXCEEDED });
    ws.close(POLICY_VIOLATION_CLOSE_CODE);
    return;
  }

  const message = parseClientMessage(raw);
  if (!message) {
    send(ws, { type: 'error', message: INVALID_MESSAGE });
    return;
  }

  switch (message.type) {
    case 'subscribe-auction':
      hub.joinRoom(connection, `auction:${message.auctionId}`);
      return;
    case 'unsubscribe-auction':
      hub.leaveRoom(connection, `auction:${message.auctionId}`);
      return;
    case 'subscribe-grid':
      hub.joinRoom(connection, 'grid');
      return;
    case 'unsubscribe-grid':
      hub.leaveRoom(connection, 'grid');
      return;
    case 'ping':
      send(ws, { type: 'pong' });
  }
}

function handleUpgrade(
  server: Server,
  wss: WebSocketServer,
  allowedOrigins: readonly string[],
): void {
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '', 'http://localhost');
    if (pathname !== REALTIME_PATH) {
      // Take ownership per Node's 'upgrade' contract even for a path we don't
      // handle — otherwise the underlying socket is left open forever.
      socket.destroy();
      return;
    }

    const userId = authenticateUpgrade(req, allowedOrigins);
    if (!userId) {
      socket.write(HTTP_UNAUTHORIZED_RESPONSE);
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, userId);
    });
  });
}

function attachHeartbeat(wss: WebSocketServer): () => void {
  const timer = setInterval(() => {
    for (const client of wss.clients) {
      const ws = client as TrackedSocket;
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  return () => clearInterval(timer);
}

export function attachRealtime(server: Server, options: RealtimeOptions): RealtimeHandle {
  const hub = createRealtimeHub();
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });

  handleUpgrade(server, wss, options.allowedOrigins);

  wss.on('connection', (ws: TrackedSocket, userId: string) => {
    const connection = hub.addConnection(userId, toSocketLike(ws));
    ws.isAlive = true;
    ws.messageCount = 0;
    const resetRate = setInterval(() => {
      ws.messageCount = 0;
    }, RATE_WINDOW_MS);

    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('message', (data: Buffer) => {
      handleClientMessage(hub, connection, ws, data.toString());
    });
    ws.on('close', () => {
      clearInterval(resetRate);
      hub.removeConnection(connection);
    });

    send(ws, { type: 'ready', userId, serverTime: new Date().toISOString() });
  });

  const stopHeartbeat = attachHeartbeat(wss);

  return {
    hub,
    close() {
      stopHeartbeat();
      for (const client of wss.clients) {
        client.terminate();
      }
      wss.close();
    },
  };
}
