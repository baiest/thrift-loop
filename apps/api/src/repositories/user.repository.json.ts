import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { User } from '../models/user.js';
import type { UserRepository } from './user.repository.js';

const JSON_INDENT = 2;

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

async function readAll(filePath: string): Promise<User[]> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as User[];
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return [];
    }
    throw error;
  }
}

async function writeAll(filePath: string, users: User[]): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(dirname(filePath), { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(filePath, JSON.stringify(users, null, JSON_INDENT), 'utf8');
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
      await writeAll(filePath, users);
    },
  };
}
