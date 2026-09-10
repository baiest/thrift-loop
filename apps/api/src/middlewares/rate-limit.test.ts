import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createRateLimiter } from './rate-limit.js';

function buildApp(limit: number): express.Express {
  const app = express();
  app.use(createRateLimiter({ windowMs: 60_000, limit }));
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
});
