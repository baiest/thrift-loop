import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@thrift-loop/shared';
import type { User } from '../models/user.js';
import { createJsonUserRepository } from './user.repository.json.js';

const sampleUser: User = {
  id: 'user-1',
  phone: '3001234567',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO',
  passwordHash: 'hashed',
  address: null,
  categoryPreference: null,
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('createJsonUserRepository', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'thrift-loop-users-'));
    filePath = join(tempDir, 'nested', 'users.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns null when the file does not exist yet', async () => {
    const repository = createJsonUserRepository(filePath);
    await expect(repository.findByPhone(sampleUser.phone)).resolves.toBeNull();
  });

  it('saves a user and finds it by phone', async () => {
    const repository = createJsonUserRepository(filePath);
    await repository.save(sampleUser);

    await expect(repository.findByPhone(sampleUser.phone)).resolves.toEqual(sampleUser);
  });

  it('returns null for a phone that was never saved', async () => {
    const repository = createJsonUserRepository(filePath);
    await repository.save(sampleUser);

    await expect(repository.findByPhone('3999999999')).resolves.toBeNull();
  });

  it('finds a saved user by id', async () => {
    const repository = createJsonUserRepository(filePath);
    await repository.save(sampleUser);

    await expect(repository.findById(sampleUser.id)).resolves.toEqual(sampleUser);
  });

  it('returns null for an id that was never saved', async () => {
    const repository = createJsonUserRepository(filePath);
    await expect(repository.findById('missing-id')).resolves.toBeNull();
  });

  it('rejects with the original error for non-missing-file failures', async () => {
    // Paths are built from mkdtemp's own return value, not attacker-controlled input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await mkdir(join(tempDir, 'nested'), { recursive: true });
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(filePath, 'not valid json', 'utf8');

    const repository = createJsonUserRepository(filePath);
    await expect(repository.findByPhone(sampleUser.phone)).rejects.toThrow();
  });

  it('returns null when updating a user that does not exist', async () => {
    const repository = createJsonUserRepository(filePath);
    await expect(repository.update('missing-id', { address: 'Calle 1' })).resolves.toBeNull();
  });

  it('patches the address and bumps updatedAt', async () => {
    const repository = createJsonUserRepository(filePath);
    await repository.save(sampleUser);

    const updated = await repository.update(sampleUser.id, { address: 'Calle 1' });

    expect(updated?.address).toBe('Calle 1');
    expect(updated?.updatedAt).not.toBe(sampleUser.updatedAt);
    await expect(repository.findById(sampleUser.id)).resolves.toEqual(updated);
  });

  it('normalizes a legacy user without notificationPreferences to the default', async () => {
    const legacyUser: Record<string, unknown> = { ...sampleUser };
    delete legacyUser['notificationPreferences'];
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await mkdir(join(tempDir, 'nested'), { recursive: true });
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(filePath, JSON.stringify([legacyUser]), 'utf8');

    const repository = createJsonUserRepository(filePath);

    await expect(repository.findById(sampleUser.id)).resolves.toEqual(sampleUser);
  });

  it('persists multiple users across repository instances', async () => {
    const repository = createJsonUserRepository(filePath);
    await repository.save(sampleUser);
    await repository.save({ ...sampleUser, id: 'user-2', phone: '3007654321' });

    const reopened = createJsonUserRepository(filePath);
    await expect(reopened.findByPhone('3007654321')).resolves.not.toBeNull();
    await expect(reopened.findByPhone(sampleUser.phone)).resolves.not.toBeNull();
  });
});
