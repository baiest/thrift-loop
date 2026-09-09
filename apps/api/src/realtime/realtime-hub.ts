import type { ServerMessage } from '@thrift-loop/shared';

export interface SocketLike {
  send(data: string): void;
  close(): void;
}

export interface Connection {
  readonly userId: string;
  readonly socket: SocketLike;
  readonly rooms: Set<string>;
}

export interface RealtimeHub {
  addConnection(userId: string, socket: SocketLike): Connection;
  removeConnection(connection: Connection): void;
  joinRoom(connection: Connection, room: string): void;
  leaveRoom(connection: Connection, room: string): void;
  broadcast(room: string, message: ServerMessage): void;
  viewerCount(auctionId: string): number;
}

function auctionRoomId(room: string): string | null {
  return room.startsWith('auction:') ? room.slice('auction:'.length) : null;
}

export function createRealtimeHub(): RealtimeHub {
  const rooms = new Map<string, Set<Connection>>();

  function send(connection: Connection, message: ServerMessage): void {
    connection.socket.send(JSON.stringify(message));
  }

  function roomMembers(room: string): Set<Connection> {
    let members = rooms.get(room);
    if (!members) {
      members = new Set();
      rooms.set(room, members);
    }
    return members;
  }

  function countDistinctUsers(members: Set<Connection>): number {
    return new Set([...members].map((connection) => connection.userId)).size;
  }

  function broadcastPresence(room: string): void {
    const auctionId = auctionRoomId(room);
    if (!auctionId) {
      return;
    }
    const members = rooms.get(room);
    const viewers = members ? countDistinctUsers(members) : 0;
    const message: ServerMessage = { type: 'presence', auctionId, viewers };
    for (const connection of members ?? []) {
      send(connection, message);
    }
  }

  return {
    addConnection(userId, socket) {
      const connection: Connection = { userId, socket, rooms: new Set() };
      roomMembers(`user:${userId}`).add(connection);
      connection.rooms.add(`user:${userId}`);
      return connection;
    },

    removeConnection(connection) {
      for (const room of [...connection.rooms]) {
        this.leaveRoom(connection, room);
      }
    },

    joinRoom(connection, room) {
      if (connection.rooms.has(room)) {
        return;
      }
      roomMembers(room).add(connection);
      connection.rooms.add(room);
      broadcastPresence(room);
    },

    leaveRoom(connection, room) {
      const members = rooms.get(room);
      if (!members?.delete(connection)) {
        return;
      }
      connection.rooms.delete(room);
      if (members.size === 0) {
        rooms.delete(room);
      }
      broadcastPresence(room);
    },

    broadcast(room, message) {
      for (const connection of rooms.get(room) ?? []) {
        send(connection, message);
      }
    },

    viewerCount(auctionId) {
      const members = rooms.get(`auction:${auctionId}`);
      return members ? countDistinctUsers(members) : 0;
    },
  };
}
