import type { NextFunction, Request, Response } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import { HTTP_STATUS } from './http-status.js';
import { NOOP_LOGGER, type Logger } from './logger.js';

const CSRF_ERROR_MESSAGE = 'Invalid or missing CSRF token';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const SESSION_COOKIE_NAME = 'session';

function getCsrfSecret(): string {
  return process.env['JWT_SECRET'] ?? '';
}

function getSessionIdentifier(req: Request): string {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  // eslint-disable-next-line security/detect-object-injection -- constant key, not user input
  const session = cookies?.[SESSION_COOKIE_NAME];
  return typeof session === 'string' ? session : '';
}

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: getCsrfSecret,
  getSessionIdentifier,
  cookieName: CSRF_COOKIE_NAME,
  cookieOptions: {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
  },
  getCsrfTokenFromRequest: (req: Request) => req.get(CSRF_HEADER_NAME),
});

/**
 * Issues a CSRF cookie tied to the given session token, e.g. right after a
 * session cookie is set on register/login. The request's own cookies are
 * patched with the session value first so the token is generated against the
 * same session identifier that will be used to validate it on later requests.
 */
export function attachCsrfCookie(req: Request, res: Response, sessionToken: string): void {
  const cookies = (req.cookies as Record<string, unknown> | undefined) ?? {};
  req.cookies = { ...cookies, [SESSION_COOKIE_NAME]: sessionToken };
  generateCsrfToken(req, res);
}

let defaultLogger: Logger = NOOP_LOGGER;

/**
 * Swaps the logger used by csrfProtection. Called once from the composition
 * root (index.ts) so route files can keep using the plain requireCsrf
 * middleware without threading a logger through every router.
 */
export function setCsrfLogger(logger: Logger): void {
  defaultLogger = logger;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  doubleCsrfProtection(req, res, (error?: unknown) => {
    if (error) {
      defaultLogger.warning('csrf_rejected', {});
      res.status(HTTP_STATUS.FORBIDDEN).json({ error: CSRF_ERROR_MESSAGE });
      return;
    }
    next();
  });
}
