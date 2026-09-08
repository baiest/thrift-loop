import type { User } from '../models/user.js';
import { readJsonArray, writeJsonArrayAtomic } from '../lib/json-file-store.js';
import type { UserPatch, UserRepository } from './user.repository.js';

// filePath is trusted app configuration (from container.ts), never user input.
export function createJsonUserRepository(filePath: string): UserRepository {
  return {
    async findByPhone(phone: string): Promise<User | null> {
      const users = await readJsonArray<User>(filePath);
      return users.find((user) => user.phone === phone) ?? null;
    },

    async findById(id: string): Promise<User | null> {
      const users = await readJsonArray<User>(filePath);
      return users.find((user) => user.id === id) ?? null;
    },

    async save(user: User): Promise<void> {
      const users = await readJsonArray<User>(filePath);
      users.push(user);
      await writeJsonArrayAtomic(filePath, users);
    },

    async update(id: string, patch: UserPatch): Promise<User | null> {
      const users = await readJsonArray<User>(filePath);
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
