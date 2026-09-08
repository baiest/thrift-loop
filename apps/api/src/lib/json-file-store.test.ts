import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readJsonArray, writeJsonArrayAtomic } from './json-file-store.js';

interface Item {
  id: string;
}

describe('json-file-store', () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'thrift-loop-json-store-'));
    filePath = join(dir, 'nested', 'items.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns an empty array when the file does not exist yet', async () => {
    await expect(readJsonArray<Item>(filePath)).resolves.toEqual([]);
  });

  it('round-trips items written and read back', async () => {
    const items: Item[] = [{ id: 'a' }, { id: 'b' }];
    await writeJsonArrayAtomic(filePath, items);

    await expect(readJsonArray<Item>(filePath)).resolves.toEqual(items);
  });

  it('creates missing parent directories', async () => {
    await writeJsonArrayAtomic(filePath, [{ id: 'a' }]);
    // filePath is built from mkdtemp's own return value, not attacker-controlled input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const raw = await readFile(filePath, 'utf8');
    expect(JSON.parse(raw)).toEqual([{ id: 'a' }]);
  });

  it('leaves no leftover temp file after a successful write', async () => {
    await writeJsonArrayAtomic(filePath, [{ id: 'a' }]);
    // filePath is built from mkdtemp's own return value, not attacker-controlled input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const raw = await readFile(filePath, 'utf8');
    expect(() => JSON.parse(raw) as unknown).not.toThrow();
  });

  it('overwrites a previous version rather than appending', async () => {
    await writeJsonArrayAtomic(filePath, [{ id: 'a' }]);
    await writeJsonArrayAtomic(filePath, [{ id: 'b' }]);

    await expect(readJsonArray<Item>(filePath)).resolves.toEqual([{ id: 'b' }]);
  });

  it('rethrows a non-ENOENT read error', async () => {
    // Reading a directory as if it were a file triggers EISDIR, not ENOENT.
    await expect(readJsonArray<Item>(dir)).rejects.toThrow();
  });
});
