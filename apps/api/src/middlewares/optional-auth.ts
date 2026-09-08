import type { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { verifySessionToken } from '../lib/jwt.js';

/**
 * Like requireAuth, but never rejects: an anonymous or invalid session simply
 * leaves res.locals['userId'] unset. For routes that behave differently for
 * a logged-in viewer (e.g. "is this my own auction?") without requiring login.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  // SESSION_COOKIE_NAME is a fixed constant, not attacker-controlled input.
  // eslint-disable-next-line security/detect-object-injection
  const token: unknown = cookies?.[SESSION_COOKIE_NAME];

  const payload = typeof token === 'string' ? verifySessionToken(token) : null;
  if (payload) {
    res.locals['userId'] = payload.userId;
  }
  next();
}
