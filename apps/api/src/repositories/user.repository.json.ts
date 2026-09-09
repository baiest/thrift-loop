import { DEFAULT_NOTIFICATION_PREFERENCES } from '@thrift-loop/shared';
import type { User } from '../models/user.js';
import { readJsonArray, writeJsonArrayAtomic } from '../lib/json-file-store.js';
import type { UserPatch, UserRepository } from './user.repository.js';

type LegacyUser = Omit<User, 'notificationPreferences'> &
  Partial<Pick<User, 'notificationPreferences'>>;

function normalize(raw: LegacyUser): User {
  return {
    ...raw,
    notificationPreferences: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...raw.notificationPreferences,
    },
  };
}

async function readAll(filePath: string): Promise<User[]> {
  const raw = await readJsonArray<LegacyUser>(filePath);
  return raw.map(normalize);
}

// filePath is trusted app configuration (from container.ts), never user input.
export function createJsonUserRepository(filePath: string): UserRepository {
  return {
    async findByPhone(phone: string): Promise<User | null> {
      const users = await readAll(filePath);
      return users.find((user) => user.phone === phone) ?? null;
    },

    async findById(id: string): Promise<User | null> {
      const users = await readAll(filePath);
      return users.find((user) => user.id === id) ?? null;
    },

    async save(user: User): Promise<void> {
      const users = await readAll(filePath);
      users.push(user);
      await writeJsonArrayAtomic(filePath, users);
    },

    async update(id: string, patch: UserPatch): Promise<User | null> {
      const users = await readAll(filePath);
      const index = users.findIndex((user) => user.id === id);
      if (index === -1) {
        return null;
      }
      // index comes from findIndex, a bounded array position, not attacker input.
      // eslint-disable-next-line security/detect-object-injection
      const existing = users[index] as User;
      const updated: User = { ...existing, ...patch, updatedAt: new Date().toISOString() };
      // eslint-disable-next-line security/detect-object-injection
      users[index] = updated;
      await writeJsonArrayAtomic(filePath, users);
      return updated;
    },
  };
}
