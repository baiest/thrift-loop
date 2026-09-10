import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLogger, NOOP_LOGGER, type Logger } from './logger.js';
import { runWithRequestId } from './request-context.js';

async function readLines(filePath: string): Promise<Record<string, unknown>[]> {
  // filePath is built from mkdtemp's own return value, not attacker-controlled input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('logger', () => {
  let dir: string;
  let filePath: string;
  let logger: Logger;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'thrift-loop-logger-'));
    filePath = join(dir, 'nested', 'app.jsonl');
    logger = createLogger(filePath);
  });

  afterEach(async () => {
    await logger.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('appends one JSON line per call with the right level and event', async () => {
    logger.info('bid_placed', { auctionId: 'AUC-1' });
    await logger.close();

    const lines = await readLines(filePath);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 'info', event: 'bid_placed', auctionId: 'AUC-1' });
  });

  it('supports warning, error, and critical levels', async () => {
    logger.warning('bid_rejected', {});
    logger.error('event_listener_failed', {});
    logger.critical('unexpected_route_error', {});
    await logger.close();

    const lines = await readLines(filePath);
    expect(lines.map((line) => line['level'])).toEqual(['warning', 'error', 'critical']);
  });

  it('includes timestamp, pid, and memoryUsedMb on every entry', async () => {
    logger.info('bid_placed', {});
    await logger.close();

    const [line] = await readLines(filePath);
    expect(typeof line?.['timestamp']).toBe('string');
    expect(line?.['pid']).toBe(process.pid);
    expect(typeof line?.['memoryUsedMb']).toBe('number');
  });

  it('includes requestId when called inside a request context', async () => {
    runWithRequestId('REQ-1', () => logger.info('bid_placed', {}));
    await logger.close();

    const [line] = await readLines(filePath);
    expect(line?.['requestId']).toBe('REQ-1');
  });

  it('omits requestId when called outside a request context', async () => {
    logger.info('bid_placed', {});
    await logger.close();

    const [line] = await readLines(filePath);
    expect(line).not.toHaveProperty('requestId');
  });

  it('includes ip when the request context carries one', async () => {
    runWithRequestId('REQ-1', () => logger.info('bid_placed', {}), '127.0.0.1');
    await logger.close();

    const [line] = await readLines(filePath);
    expect(line?.['ip']).toBe('127.0.0.1');
  });

  it('omits ip when the request context carries none', async () => {
    runWithRequestId('REQ-1', () => logger.info('bid_placed', {}));
    await logger.close();

    const [line] = await readLines(filePath);
    expect(line).not.toHaveProperty('ip');
  });

  it('throws on an invalid (non-snake_case) event name and writes nothing', async () => {
    expect(() => logger.info('BidPlaced', {})).toThrow();
    expect(() => logger.info('bid placed', {})).toThrow();
    expect(() => logger.info('bid__placed', {})).toThrow();
    await logger.close();

    const lines = await readLines(filePath);
    expect(lines).toHaveLength(0);
  });

  describe('time', () => {
    it('logs info + outcome success + durationMs and returns the resolved value on success', async () => {
      const result = await logger.time('bid_place_flow', { auctionId: 'AUC-1' }, () =>
        Promise.resolve('ok'),
      );
      await logger.close();

      expect(result).toBe('ok');
      const [line] = await readLines(filePath);
      expect(line).toMatchObject({
        level: 'info',
        event: 'bid_place_flow',
        outcome: 'success',
        auctionId: 'AUC-1',
      });
      expect(typeof line?.['durationMs']).toBe('number');
    });

    it('logs error + outcome failure + durationMs and rethrows on failure', async () => {
      const failure = new Error('boom');
      await expect(
        logger.time('bid_place_flow', {}, () => Promise.reject(failure)),
      ).rejects.toThrow('boom');
      await logger.close();

      const [line] = await readLines(filePath);
      expect(line).toMatchObject({
        level: 'error',
        event: 'bid_place_flow',
        outcome: 'failure',
        message: 'boom',
      });
    });
  });

  describe('NOOP_LOGGER', () => {
    it('does nothing and never throws, including on an invalid event name', async () => {
      expect(() => NOOP_LOGGER.info('Not Valid', {})).not.toThrow();
      expect(() => NOOP_LOGGER.critical('also not valid', {})).not.toThrow();
      await expect(NOOP_LOGGER.close()).resolves.toBeUndefined();
      const result = await NOOP_LOGGER.time('anything at all', {}, () => Promise.resolve('value'));
      expect(result).toBe('value');
    });
  });
});
