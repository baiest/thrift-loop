import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import type { Logger } from '../lib/logger.js';
import { createRateLimiter } from './rate-limit.js';

interface RecordedLogCall {
  level: string;
  event: string;
  fields: Record<string, unknown>;
}

function createFakeLogger(): { logger: Logger; calls: RecordedLogCall[] } {
  const calls: RecordedLogCall[] = [];
  const record =
    (level: string) =>
    (event: string, fields: Record<string, unknown> = {}) => {
      calls.push({ level, event, fields });
    };
  return {
    calls,
    logger: {
      info: record('info'),
      warning: record('warning'),
      error: record('error'),
      critical: record('critical'),
      time: async (_event, _fields, fn) => fn(),
      close: async () => {},
    },
  };
}

function buildApp(limit: number, logger?: Logger): express.Express {
  const app = express();
  app.use(createRateLimiter({ windowMs: 60_000, limit }, logger));
  app.get('/probe', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe('createRateLimiter', () => {
  it('allows requests under the limit', async () => {
    const app = buildApp(2);

    const first = await request(app).get('/probe');
    const second = await request(app).get('/probe');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it('blocks requests once the limit is exceeded', async () => {
    const app = buildApp(2);

    await request(app).get('/probe');
    await request(app).get('/probe');
    const third = await request(app).get('/probe');

    expect(third.status).toBe(429);
  });

  it('returns a JSON error body on 429', async () => {
    const app = buildApp(1);

    await request(app).get('/probe');
    const blocked = await request(app).get('/probe');

    expect(blocked.body).toEqual({ error: 'Too many requests, try again later' });
  });

  it('logs rate_limit_exceeded when a client is blocked', async () => {
    const { logger, calls } = createFakeLogger();
    const app = buildApp(1, logger);

    await request(app).get('/probe');
    await request(app).get('/probe');

    expect(calls).toContainEqual({
      level: 'warning',
      event: 'rate_limit_exceeded',
      fields: { path: '/probe' },
    });
  });
});
