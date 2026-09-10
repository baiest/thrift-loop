import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { getIp, getRequestId } from './request-context.js';

export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

const EVENT_SEGMENT_PATTERN = /^[a-z][a-z0-9]*$/;
const BYTES_PER_KILOBYTE = 1024;
const MEGABYTE_ROUNDING_PRECISION = 100;

export interface Logger {
  info(event: string, fields?: Record<string, unknown>): void;
  warning(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
  critical(event: string, fields?: Record<string, unknown>): void;
  time<T>(event: string, fields: Record<string, unknown>, fn: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

function isValidEvent(event: string): boolean {
  const segments = event.split('_');
  return segments.length > 0 && segments.every((segment) => EVENT_SEGMENT_PATTERN.test(segment));
}

function assertValidEvent(event: string): void {
  if (!isValidEvent(event)) {
    throw new Error(`Invalid log event name: ${event}`);
  }
}

function memoryUsedMb(): number {
  const megabytes = process.memoryUsage().rss / (BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE);
  return Math.round(megabytes * MEGABYTE_ROUNDING_PRECISION) / MEGABYTE_ROUNDING_PRECISION;
}

function buildEntry(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const requestId = getRequestId();
  const ip = getIp();
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(requestId ? { requestId } : {}),
    ...(ip ? { ip } : {}),
    pid: process.pid,
    memoryUsedMb: memoryUsedMb(),
    ...fields,
  };
}

/** filePath is trusted app configuration (from container.ts), never user input. */
export function createLogger(filePath: string): Logger {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  mkdirSync(dirname(filePath), { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const stream: WriteStream = createWriteStream(filePath, { flags: 'a' });

  function write(level: LogLevel, event: string, fields: Record<string, unknown>): void {
    assertValidEvent(event);
    stream.write(`${JSON.stringify(buildEntry(level, event, fields))}\n`);
  }

  async function time<T>(
    event: string,
    fields: Record<string, unknown>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      write('info', event, {
        ...fields,
        outcome: 'success',
        durationMs: performance.now() - start,
      });
      return result;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      write('error', event, {
        ...fields,
        outcome: 'failure',
        durationMs: performance.now() - start,
        message,
      });
      throw caught;
    }
  }

  return {
    info: (event, fields = {}) => write('info', event, fields),
    warning: (event, fields = {}) => write('warning', event, fields),
    error: (event, fields = {}) => write('error', event, fields),
    critical: (event, fields = {}) => write('critical', event, fields),
    time,
    close: () =>
      new Promise<void>((resolve, reject) => {
        if (stream.closed || stream.destroyed) {
          resolve();
          return;
        }
        stream.end((error: NodeJS.ErrnoException | null | undefined) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

export const NOOP_LOGGER: Logger = {
  info: () => {},
  warning: () => {},
  error: () => {},
  critical: () => {},
  time: async (_event, _fields, fn) => fn(),
  close: async () => {},
};
