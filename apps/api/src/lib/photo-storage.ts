import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { extensionForPhotoMimeType, type AllowedPhotoMimeType } from '@thrift-loop/shared';

export interface UploadedFile {
  originalName: string;
  mimeType: AllowedPhotoMimeType;
  buffer: Buffer;
}

export interface PhotoStorage {
  savePhotos(userId: string, auctionId: string, files: UploadedFile[]): Promise<string[]>;
  deletePhotosForAuction(userId: string, auctionId: string): Promise<void>;
}

// baseDir is trusted app configuration (from container.ts), never user input.
export function createLocalPhotoStorage(baseDir: string): PhotoStorage {
  return {
    async savePhotos(userId, auctionId, files) {
      const dir = join(baseDir, userId, auctionId);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await mkdir(dir, { recursive: true });

      const keys: string[] = [];
      for (const file of files) {
        // Extension comes from the file's own validated content-type, never
        // from client-supplied input (originalName) — see extensionForPhotoMimeType.
        const fileName = `${randomUUID()}${extensionForPhotoMimeType(file.mimeType)}`;
        const key = `${userId}/${auctionId}/${fileName}`;
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await writeFile(join(baseDir, key), file.buffer);
        keys.push(key);
      }
      return keys;
    },

    async deletePhotosForAuction(userId, auctionId) {
      const dir = join(baseDir, userId, auctionId);
      await rm(dir, { recursive: true, force: true });
    },
  };
}
