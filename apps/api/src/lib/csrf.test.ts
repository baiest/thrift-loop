import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  attachCsrfCookie,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  csrfProtection,
  setCsrfLogger,
} from './csrf.js';
import { NOOP_LOGGER, type Logger } from './logger.js';

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

function createResponse(): Response & { cookieCalls: [string, string][] } {
  const cookieCalls: [string, string][] = [];
  const res = {
    cookieCalls,
    cookie: vi.fn((name: string, value: string) => {
      cookieCalls.push([name, value]);
      return res;
    }),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & { cookieCalls: [string, string][] };
}

function createRequest(cookies: Record<string, string>, headerValue?: string): Request {
  return {
    cookies,
    headers: headerValue === undefined ? {} : { [CSRF_HEADER_NAME]: headerValue },
    get: (name: string) => (name.toLowerCase() === CSRF_HEADER_NAME ? headerValue : undefined),
  } as unknown as Request;
}

describe('attachCsrfCookie', () => {
  it('sets a non-httpOnly csrf cookie the frontend can read', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const req = createRequest({});
    const res = createResponse();

    attachCsrfCookie(req, res, 'session-token');

    expect(res.cookieCalls[0]?.[0]).toBe(CSRF_COOKIE_NAME);
    expect(res.cookie).toHaveBeenCalledWith(
      CSRF_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: 'strict' }),
    );
    vi.unstubAllEnvs();
  });
});

describe('attachCsrfCookie in production', () => {
  it('marks the cookie secure when NODE_ENV is production at load time', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    const productionCsrf = await import('./csrf.js');

    const req = createRequest({});
    const res = createResponse();
    productionCsrf.attachCsrfCookie(req, res, 'session-token');

    expect(res.cookie).toHaveBeenCalledWith(
      CSRF_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe('csrfProtection', () => {
  afterEach(() => {
    setCsrfLogger(NOOP_LOGGER);
  });

  it('calls next when the header matches a token issued for the same session', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const req = createRequest({ session: 'session-token' });
    const res = createResponse();

    attachCsrfCookie(req, res, 'session-token');
    const issuedToken = res.cookieCalls[0]?.[1] as string;
    const protectedReq = createRequest(
      { session: 'session-token', [CSRF_COOKIE_NAME]: issuedToken },
      issuedToken,
    );
    const next = vi.fn();

    csrfProtection(protectedReq, res, next);

    expect(next).toHaveBeenCalledOnce();
    vi.unstubAllEnvs();
  });

  it('rejects with 403 when the header is missing', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const req = createRequest({ session: 'session-token' });
    const res = createResponse();
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    vi.unstubAllEnvs();
  });

  it('rejects when the token was issued for a different session', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const res = createResponse();
    attachCsrfCookie(createRequest({}), res, 'session-a');
    const issuedToken = res.cookieCalls[0]?.[1] as string;

    const protectedReq = createRequest(
      { session: 'session-b', [CSRF_COOKIE_NAME]: issuedToken },
      issuedToken,
    );
    const next = vi.fn();

    csrfProtection(protectedReq, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    vi.unstubAllEnvs();
  });

  it('logs csrf_rejected via the configured logger when the header is missing', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const { logger, calls } = createFakeLogger();
    setCsrfLogger(logger);
    const req = createRequest({ session: 'session-token' });
    const res = createResponse();

    csrfProtection(req, res, vi.fn());

    expect(calls).toContainEqual({ level: 'warning', event: 'csrf_rejected', fields: {} });
    vi.unstubAllEnvs();
  });
});
