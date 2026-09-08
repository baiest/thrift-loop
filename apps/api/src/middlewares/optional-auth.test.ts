import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { signSessionToken } from '../lib/jwt.js';
import { optionalAuth } from './optional-auth.js';

function createResponse(): Response {
  return { locals: {} } as unknown as Response;
}

describe('optionalAuth', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sets userId in res.locals when a valid session cookie is present', () => {
    const token = signSessionToken({ userId: 'USR-1' });
    const req = { cookies: { [SESSION_COOKIE_NAME]: token } } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(res.locals['userId']).toBe('USR-1');
    expect(next).toHaveBeenCalledOnce();
  });

  it('leaves userId undefined and still calls next when there is no cookie', () => {
    const req = { cookies: {} } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(res.locals['userId']).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('leaves userId undefined and still calls next when the token is invalid', () => {
    const req = { cookies: { [SESSION_COOKIE_NAME]: 'not-a-token' } } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(res.locals['userId']).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });
});
