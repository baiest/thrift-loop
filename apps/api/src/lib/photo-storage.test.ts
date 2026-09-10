import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLocalPhotoStorage, type UploadedFile } from './photo-storage.js';

describe('createLocalPhotoStorage', () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'thrift-loop-uploads-'));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it('saves photos under <userId>/<auctionId> and returns their relative keys', async () => {
    const storage = createLocalPhotoStorage(baseDir);
    const files: UploadedFile[] = [
      { originalName: 'front.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('front-bytes') },
      { originalName: 'back.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('back-bytes') },
    ];

    const keys = await storage.savePhotos('USR-1', 'AUC-1', files);

    expect(keys).toHaveLength(2);
    for (const key of keys) {
      expect(key.startsWith('USR-1/AUC-1/')).toBe(true);
    }
  });

  it('derives the stored extension from the mimeType, ignoring the originalName extension', async () => {
    // Regression: extension used to come from originalName, not mimeType —
    // stored XSS (see extensionForPhotoMimeType).
    const storage = createLocalPhotoStorage(baseDir);
    const [key] = await storage.savePhotos('USR-1', 'AUC-1', [
      { originalName: 'evil.svg', mimeType: 'image/png', buffer: Buffer.from('<svg/>') },
    ]);

    expect(key).toMatch(/\.png$/);
    expect(key).not.toMatch(/\.svg$/);
  });

  it('writes the actual file contents to disk', async () => {
    const storage = createLocalPhotoStorage(baseDir);
    const [key] = await storage.savePhotos('USR-1', 'AUC-1', [
      { originalName: 'front.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('hello') },
    ]);

    // Path is built from the storage's own returned key, not attacker input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const contents = await readFile(join(baseDir, key as string), 'utf8');
    expect(contents).toBe('hello');
  });

  it('gives each saved file a unique name even with duplicate originalNames', async () => {
    const storage = createLocalPhotoStorage(baseDir);
    const keys = await storage.savePhotos('USR-1', 'AUC-1', [
      { originalName: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('a') },
      { originalName: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('b') },
    ]);

    expect(new Set(keys).size).toBe(2);
  });

  it('deletes every photo file for an auction', async () => {
    const storage = createLocalPhotoStorage(baseDir);
    await storage.savePhotos('USR-1', 'AUC-1', [
      { originalName: 'front.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('a') },
    ]);

    await storage.deletePhotosForAuction('USR-1', 'AUC-1');

    // Path is built from a fixed test fixture id, not attacker input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const entries = await readdir(join(baseDir, 'USR-1')).catch(() => []);
    expect(entries).not.toContain('AUC-1');
  });

  it('does not throw when deleting an auction that has no photo directory', async () => {
    const storage = createLocalPhotoStorage(baseDir);
    await expect(storage.deletePhotosForAuction('USR-1', 'AUC-missing')).resolves.not.toThrow();
  });
});
