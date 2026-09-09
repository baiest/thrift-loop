import type { IncomingMessage } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signSessionToken } from '../lib/jwt.js';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { authenticateUpgrade } from './authenticate-upgrade.js';

function makeRequest(headers: Record<string, string | undefined>): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

const ALLOWED_ORIGINS = ['http://localhost:5173'];

describe('authenticateUpgrade', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the userId for a valid session cookie', () => {
    const token = signSessionToken({ userId: 'USR-1' });
    const req = makeRequest({
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      origin: 'http://localhost:5173',
    });

    expect(authenticateUpgrade(req, ALLOWED_ORIGINS)).toBe('USR-1');
  });

  it('returns null when there is no cookie header', () => {
    const req = makeRequest({});
    expect(authenticateUpgrade(req, ALLOWED_ORIGINS)).toBeNull();
  });

  it('returns null when the session cookie is missing among other cookies', () => {
    const req = makeRequest({ cookie: 'other=value; another=thing' });
    expect(authenticateUpgrade(req, ALLOWED_ORIGINS)).toBeNull();
  });

  it('returns null for a malformed token', () => {
    const req = makeRequest({ cookie: `${SESSION_COOKIE_NAME}=not-a-real-token` });
    expect(authenticateUpgrade(req, ALLOWED_ORIGINS)).toBeNull();
  });

  it('returns null for an expired or invalidly signed token', () => {
    const token = signSessionToken({ userId: 'USR-1' });
    vi.stubEnv('JWT_SECRET', 'a-different-secret');
    const req = makeRequest({ cookie: `${SESSION_COOKIE_NAME}=${token}` });

    expect(authenticateUpgrade(req, ALLOWED_ORIGINS)).toBeNull();
  });

  it('returns null when the Origin header is present but not allowed', () => {
    const token = signSessionToken({ userId: 'USR-1' });
    const req = makeRequest({
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      origin: 'https://evil.example',
    });

    expect(authenticateUpgrade(req, ALLOWED_ORIGINS)).toBeNull();
  });

  it('allows a valid session when no Origin header is present', () => {
    const token = signSessionToken({ userId: 'USR-1' });
    const req = makeRequest({ cookie: `${SESSION_COOKIE_NAME}=${token}` });

    expect(authenticateUpgrade(req, ALLOWED_ORIGINS)).toBe('USR-1');
  });

  it('handles a cookie value that needs URL-decoding', () => {
    const token = signSessionToken({ userId: 'USR-1' });
    const req = makeRequest({ cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` });

    expect(authenticateUpgrade(req, ALLOWED_ORIGINS)).toBe('USR-1');
  });
});
