import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Notification } from '../models/notification.js';
import { createJsonNotificationRepository } from './notification.repository.json.js';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'NTF-1',
    userId: 'USR-1',
    type: 'outbid',
    auctionId: 'AUC-1',
    auctionTitle: 'Chaqueta de cuero',
    amountCOP: 60_000,
    actorFirstName: 'Ana',
    readAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('createJsonNotificationRepository', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'thrift-loop-notifications-'));
    filePath = join(tempDir, 'nested', 'notifications.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns an empty list when the file does not exist yet', async () => {
    const repository = createJsonNotificationRepository(filePath);
    await expect(repository.findByUserId('USR-1', 10)).resolves.toEqual([]);
  });

  it('saves a notification and finds it by user, newest first', async () => {
    const repository = createJsonNotificationRepository(filePath);
    await repository.save(makeNotification({ id: 'NTF-1', createdAt: '2026-01-01T00:00:00.000Z' }));
    await repository.save(makeNotification({ id: 'NTF-2', createdAt: '2026-01-02T00:00:00.000Z' }));

    const notifications = await repository.findByUserId('USR-1', 10);

    expect(notifications.map((n) => n.id)).toEqual(['NTF-2', 'NTF-1']);
  });

  it('only returns notifications for the given user', async () => {
    const repository = createJsonNotificationRepository(filePath);
    await repository.save(makeNotification({ id: 'NTF-1', userId: 'USR-1' }));
    await repository.save(makeNotification({ id: 'NTF-2', userId: 'USR-2' }));

    const notifications = await repository.findByUserId('USR-1', 10);

    expect(notifications).toEqual([expect.objectContaining({ id: 'NTF-1' })]);
  });

  it('respects the limit', async () => {
    const repository = createJsonNotificationRepository(filePath);
    for (let i = 0; i < 5; i += 1) {
      await repository.save(
        makeNotification({ id: `NTF-${i}`, createdAt: `2026-01-0${i + 1}T00:00:00.000Z` }),
      );
    }

    const notifications = await repository.findByUserId('USR-1', 2);

    expect(notifications).toHaveLength(2);
  });

  it('saves many notifications in one write', async () => {
    const repository = createJsonNotificationRepository(filePath);

    await repository.saveMany([
      makeNotification({ id: 'NTF-1' }),
      makeNotification({ id: 'NTF-2', userId: 'USR-2' }),
    ]);

    await expect(repository.findByUserId('USR-1', 10)).resolves.toHaveLength(1);
    await expect(repository.findByUserId('USR-2', 10)).resolves.toHaveLength(1);
  });

  it('counts unread notifications for a user', async () => {
    const repository = createJsonNotificationRepository(filePath);
    await repository.save(makeNotification({ id: 'NTF-1', readAt: null }));
    await repository.save(makeNotification({ id: 'NTF-2', readAt: '2026-01-02T00:00:00.000Z' }));

    await expect(repository.countUnread('USR-1')).resolves.toBe(1);
  });

  it('marks one notification read and returns it', async () => {
    const repository = createJsonNotificationRepository(filePath);
    await repository.save(makeNotification({ id: 'NTF-1', readAt: null }));

    const updated = await repository.markRead('USR-1', 'NTF-1');

    expect(updated?.readAt).not.toBeNull();
    await expect(repository.countUnread('USR-1')).resolves.toBe(0);
  });

  it('does not let a user mark another user notification read', async () => {
    const repository = createJsonNotificationRepository(filePath);
    await repository.save(makeNotification({ id: 'NTF-1', userId: 'USR-owner', readAt: null }));

    const updated = await repository.markRead('USR-other', 'NTF-1');

    expect(updated).toBeNull();
    await expect(repository.countUnread('USR-owner')).resolves.toBe(1);
  });

  it('returns null when marking a missing notification read', async () => {
    const repository = createJsonNotificationRepository(filePath);
    await expect(repository.markRead('USR-1', 'NTF-missing')).resolves.toBeNull();
  });

  it('marks all of a user notifications read and returns how many changed', async () => {
    const repository = createJsonNotificationRepository(filePath);
    await repository.save(makeNotification({ id: 'NTF-1', readAt: null }));
    await repository.save(makeNotification({ id: 'NTF-2', readAt: null }));
    await repository.save(makeNotification({ id: 'NTF-3', userId: 'USR-2', readAt: null }));

    const updated = await repository.markAllRead('USR-1');

    expect(updated).toBe(2);
    await expect(repository.countUnread('USR-1')).resolves.toBe(0);
    await expect(repository.countUnread('USR-2')).resolves.toBe(1);
  });
});
