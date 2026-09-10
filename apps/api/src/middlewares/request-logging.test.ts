import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../lib/logger.js';
import { getRequestId } from '../lib/request-context.js';
import { createRequestLoggingMiddleware } from './request-logging.js';

interface RecordedCall {
  level: string;
  event: string;
  fields: Record<string, unknown>;
}

function createFakeLogger(): { logger: Logger; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
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

function buildApp(logger: Logger): express.Express {
  const app = express();
  app.use(createRequestLoggingMiddleware(logger));
  app.get('/ok', (_req, res) => res.status(200).json({ ok: true }));
  app.get('/missing', (_req, res) => res.status(404).json({ error: 'not found' }));
  app.get('/broken', (_req, res) => res.status(500).json({ error: 'broken' }));
  app.get('/context', (_req, res) => res.status(200).json({ requestId: getRequestId() }));
  app.get('/slow', () => {
    // Never responds — simulates a handler still working when the client gives up.
  });
  return app;
}

describe('createRequestLoggingMiddleware', () => {
  it('logs one http_request line at info for a 2xx response', async () => {
    const { logger, calls } = createFakeLogger();
    await request(buildApp(logger)).get('/ok');

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ level: 'info', event: 'http_request' });
    expect(calls[0]?.fields).toMatchObject({ method: 'GET', path: '/ok', status: 200 });
    expect(typeof calls[0]?.fields['durationMs']).toBe('number');
  });

  it('logs at warning for a 4xx response', async () => {
    const { logger, calls } = createFakeLogger();
    await request(buildApp(logger)).get('/missing');

    expect(calls[0]?.level).toBe('warning');
  });

  it('logs at critical for a 5xx response', async () => {
    const { logger, calls } = createFakeLogger();
    await request(buildApp(logger)).get('/broken');

    expect(calls[0]?.level).toBe('critical');
  });

  it('makes a request id available to the handler via getRequestId()', async () => {
    const { logger } = createFakeLogger();
    const response = await request(buildApp(logger)).get('/context');
    const body = response.body as { requestId: unknown };

    expect(typeof body.requestId).toBe('string');
  });

  it('logs http_request_aborted at warning when the client disconnects before a response is sent', async () => {
    const { logger, calls } = createFakeLogger();
    const app = buildApp(logger);

    await new Promise<void>((resolve) => {
      request(app)
        .get('/slow')
        .timeout({ response: 20 })
        .end(() => resolve());
    });
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ level: 'warning', event: 'http_request_aborted' });
    expect(calls[0]?.fields).toMatchObject({ method: 'GET', path: '/slow' });
    expect(typeof calls[0]?.fields['durationMs']).toBe('number');
  });
});
