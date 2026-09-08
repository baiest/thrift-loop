import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../lib/csrf.js';
import { requireCsrf } from './require-csrf.js';

function createResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

function createRequest(cookieValue?: string, headerValue?: string): Request {
  return {
    cookies: cookieValue === undefined ? {} : { [CSRF_COOKIE_NAME]: cookieValue },
    get: (name: string) => (name.toLowerCase() === CSRF_HEADER_NAME ? headerValue : undefined),
  } as unknown as Request;
}

describe('requireCsrf', () => {
  it('calls next when the cookie and header tokens match', () => {
    const req = createRequest('same-token', 'same-token');
    const res = createResponse();
    const next = vi.fn();

    requireCsrf(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects when the header is missing', () => {
    const req = createRequest('same-token');
    const res = createResponse();
    const next = vi.fn();

    requireCsrf(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects when the cookie is missing', () => {
    const req = createRequest(undefined, 'same-token');
    const res = createResponse();
    const next = vi.fn();

    requireCsrf(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects when the cookie and header tokens differ', () => {
    const req = createRequest('token-a', 'token-b');
    const res = createResponse();
    const next = vi.fn();

    requireCsrf(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
