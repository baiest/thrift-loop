import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { asyncHandler, createAsyncHandler, setDefaultAsyncHandlerLogger } from './async-handler.js';
import { HttpError } from './http-error.js';
import { NOOP_LOGGER, type Logger } from './logger.js';

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

function buildApp(handler: express.RequestHandler): express.Express {
  const app = express();
  app.get('/probe', handler);
  return app;
}

describe('asyncHandler', () => {
  it('calls through to a successful handler normally', async () => {
    const app = buildApp(
      // Test fixture only: real handlers always await a service call.
      // eslint-disable-next-line @typescript-eslint/require-await
      asyncHandler(async (_req, res) => {
        res.status(200).json({ ok: true });
      }),
    );

    const response = await request(app).get('/probe');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('turns a thrown HttpError into its status and body', async () => {
    const app = buildApp(
      // Test fixture only: real handlers always await a service call.
      // eslint-disable-next-line @typescript-eslint/require-await
      asyncHandler(async () => {
        throw new HttpError('Validation failed', 400, { phone: 'Invalid' });
      }),
    );

    const response = await request(app).get('/probe');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Validation failed', fields: { phone: 'Invalid' } });
  });

  it('turns an unexpected error into a generic 500 without crashing', async () => {
    const app = buildApp(
      // Test fixture only: real handlers always await a service call.
      // eslint-disable-next-line @typescript-eslint/require-await
      asyncHandler(async () => {
        throw new Error('database is down');
      }),
    );

    const response = await request(app).get('/probe');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Something went wrong' });
  });
});

describe('createAsyncHandler', () => {
  it('logs a critical unexpected_route_error with message and stack for a non-HttpError throw', async () => {
    const { logger, calls } = createFakeLogger();
    const app = buildApp(
      // Test fixture only: real handlers always await a service call.
      // eslint-disable-next-line @typescript-eslint/require-await
      createAsyncHandler(logger)(async () => {
        throw new Error('database is down');
      }),
    );

    const response = await request(app).get('/probe');

    expect(response.status).toBe(500);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ level: 'critical', event: 'unexpected_route_error' });
    expect(calls[0]?.fields).toMatchObject({ message: 'database is down' });
    expect(typeof calls[0]?.fields['stack']).toBe('string');
  });

  it('does not log a critical line for an HttpError', async () => {
    const { logger, calls } = createFakeLogger();
    const app = buildApp(
      // Test fixture only: real handlers always await a service call.
      // eslint-disable-next-line @typescript-eslint/require-await
      createAsyncHandler(logger)(async () => {
        throw new HttpError('Validation failed', 400, {});
      }),
    );

    await request(app).get('/probe');

    expect(calls).toHaveLength(0);
  });
});

describe('swapping the default async handler logger', () => {
  it('makes the shared asyncHandler export log through the given logger', async () => {
    const { logger, calls } = createFakeLogger();
    setDefaultAsyncHandlerLogger(logger);
    try {
      const app = buildApp(
        // Test fixture only: real handlers always await a service call.
        // eslint-disable-next-line @typescript-eslint/require-await
        asyncHandler(async () => {
          throw new Error('database is down');
        }),
      );

      await request(app).get('/probe');

      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ level: 'critical', event: 'unexpected_route_error' });
    } finally {
      setDefaultAsyncHandlerLogger(NOOP_LOGGER);
    }
  });
});
