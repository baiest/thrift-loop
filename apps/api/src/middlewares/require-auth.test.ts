import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { signSessionToken } from '../lib/jwt.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { requireAuth } from './require-auth.js';

function createResponse(): Response {
  const res = {
    locals: {},
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calls next and sets res.locals.userId for a valid session cookie', () => {
    const token = signSessionToken({ userId: 'user-1' });
    const req = { cookies: { [SESSION_COOKIE_NAME]: token } } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.locals['userId']).toBe('user-1');
  });

  it('responds 401 when there is no cookie', () => {
    const req = { cookies: {} } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('responds 401 for an invalid token', () => {
    const req = { cookies: { [SESSION_COOKIE_NAME]: 'garbage' } } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
