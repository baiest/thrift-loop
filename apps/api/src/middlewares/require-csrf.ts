import type { NextFunction, Request, Response } from 'express';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../lib/csrf.js';
import { HTTP_STATUS } from '../lib/http-status.js';

const CSRF_ERROR_MESSAGE = 'Invalid or missing CSRF token';

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  // CSRF_COOKIE_NAME is a fixed constant, not attacker-controlled input.
  // eslint-disable-next-line security/detect-object-injection
  const cookieToken = cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  const isValid =
    typeof cookieToken === 'string' &&
    cookieToken.length > 0 &&
    typeof headerToken === 'string' &&
    cookieToken === headerToken;

  if (!isValid) {
    res.status(HTTP_STATUS.FORBIDDEN).json({ error: CSRF_ERROR_MESSAGE });
    return;
  }

  next();
}
