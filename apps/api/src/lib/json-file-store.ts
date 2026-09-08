import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const JSON_INDENT = 2;

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

/** filePath is trusted app configuration (from container.ts), never user input. */
export async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T[];
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return [];
    }
    throw error;
  }
}

/**
 * Writes the whole array atomically: the file at `filePath` either has the
 * previous content or the new content, never a half-written mix, because the
 * write lands on a temp file first and `rename` is atomic on POSIX and NTFS.
 */
export async function writeJsonArrayAtomic<T>(filePath: string, items: T[]): Promise<void> {
  const dir = dirname(filePath);
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(dir, { recursive: true });

  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(tempPath, JSON.stringify(items, null, JSON_INDENT), 'utf8');
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await rename(tempPath, filePath);
}
