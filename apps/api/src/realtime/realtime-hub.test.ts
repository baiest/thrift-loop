import { describe, expect, it } from 'vitest';
import type { ServerMessage } from '@thrift-loop/shared';
import { createRealtimeHub, type SocketLike } from './realtime-hub.js';

class FakeSocket implements SocketLike {
  readonly sent: string[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }

  lastMessage(): ServerMessage {
    return JSON.parse(this.sent[this.sent.length - 1] as string) as ServerMessage;
  }
}

describe('createRealtimeHub', () => {
  it('auto-joins a new connection to its own user room', () => {
    const hub = createRealtimeHub();
    const socket = new FakeSocket();
    const connection = hub.addConnection('USR-1', socket);

    hub.broadcast('user:USR-1', { type: 'pong' });

    expect(connection.userId).toBe('USR-1');
    expect(socket.lastMessage()).toEqual({ type: 'pong' });
  });

  it('does not deliver to a room the connection never joined', () => {
    const hub = createRealtimeHub();
    const socket = new FakeSocket();
    hub.addConnection('USR-1', socket);

    hub.broadcast('auction:AUC-1', { type: 'pong' });

    expect(socket.sent).toEqual([]);
  });

  it('delivers a broadcast to every connection in a joined room', () => {
    const hub = createRealtimeHub();
    const socketA = new FakeSocket();
    const socketB = new FakeSocket();
    const connectionA = hub.addConnection('USR-1', socketA);
    const connectionB = hub.addConnection('USR-2', socketB);
    hub.joinRoom(connectionA, 'auction:AUC-1');
    hub.joinRoom(connectionB, 'auction:AUC-1');

    hub.broadcast('auction:AUC-1', { type: 'pong' });

    expect(socketA.lastMessage()).toEqual({ type: 'pong' });
    expect(socketB.lastMessage()).toEqual({ type: 'pong' });
  });

  it('stops delivering after leaveRoom', () => {
    const hub = createRealtimeHub();
    const socket = new FakeSocket();
    const connection = hub.addConnection('USR-1', socket);
    hub.joinRoom(connection, 'auction:AUC-1');

    hub.leaveRoom(connection, 'auction:AUC-1');
    const sentBeforeBroadcast = socket.sent.length;
    hub.broadcast('auction:AUC-1', { type: 'pong' });

    expect(socket.sent).toHaveLength(sentBeforeBroadcast);
  });

  it('counts distinct users in an auction room, not connections', () => {
    const hub = createRealtimeHub();
    const socketTabOne = new FakeSocket();
    const socketTabTwo = new FakeSocket();
    const socketOther = new FakeSocket();
    const connectionTabOne = hub.addConnection('USR-1', socketTabOne);
    const connectionTabTwo = hub.addConnection('USR-1', socketTabTwo);
    const connectionOther = hub.addConnection('USR-2', socketOther);

    hub.joinRoom(connectionTabOne, 'auction:AUC-1');
    expect(hub.viewerCount('AUC-1')).toBe(1);

    hub.joinRoom(connectionTabTwo, 'auction:AUC-1');
    expect(hub.viewerCount('AUC-1')).toBe(1);

    hub.joinRoom(connectionOther, 'auction:AUC-1');
    expect(hub.viewerCount('AUC-1')).toBe(2);
  });

  it('broadcasts a presence update on join and on leave', () => {
    const hub = createRealtimeHub();
    const socketA = new FakeSocket();
    const socketB = new FakeSocket();
    const connectionA = hub.addConnection('USR-1', socketA);
    const connectionB = hub.addConnection('USR-2', socketB);

    hub.joinRoom(connectionA, 'auction:AUC-1');
    expect(socketA.lastMessage()).toEqual({
      type: 'presence',
      auctionId: 'AUC-1',
      viewers: 1,
    });

    hub.joinRoom(connectionB, 'auction:AUC-1');
    expect(socketA.lastMessage()).toEqual({
      type: 'presence',
      auctionId: 'AUC-1',
      viewers: 2,
    });

    hub.leaveRoom(connectionB, 'auction:AUC-1');
    expect(socketA.lastMessage()).toEqual({
      type: 'presence',
      auctionId: 'AUC-1',
      viewers: 1,
    });
  });

  it('removeConnection leaves every room the connection was in and cleans up', () => {
    const hub = createRealtimeHub();
    const socketA = new FakeSocket();
    const socketB = new FakeSocket();
    const connectionA = hub.addConnection('USR-1', socketA);
    const connectionB = hub.addConnection('USR-2', socketB);
    hub.joinRoom(connectionA, 'auction:AUC-1');
    hub.joinRoom(connectionB, 'auction:AUC-1');

    hub.removeConnection(connectionA);

    expect(hub.viewerCount('AUC-1')).toBe(1);
    const sentBeforeBroadcast = socketA.sent.length;
    hub.broadcast('user:USR-1', { type: 'pong' });
    expect(socketA.sent).toHaveLength(sentBeforeBroadcast);
  });

  it('viewerCount is zero for a room nobody has joined', () => {
    const hub = createRealtimeHub();
    expect(hub.viewerCount('AUC-missing')).toBe(0);
  });

  it('removeConnection is a no-op when called twice', () => {
    const hub = createRealtimeHub();
    const socket = new FakeSocket();
    const connection = hub.addConnection('USR-1', socket);
    hub.joinRoom(connection, 'auction:AUC-1');

    hub.removeConnection(connection);
    expect(() => hub.removeConnection(connection)).not.toThrow();
  });
});
