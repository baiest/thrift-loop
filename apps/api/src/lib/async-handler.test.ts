import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { asyncHandler } from './async-handler.js';
import { HttpError } from './http-error.js';

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
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
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
    consoleSpy.mockRestore();
  });
});
