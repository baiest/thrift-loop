import { Router, type RequestHandler } from 'express';
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { attachCsrfCookie, CSRF_COOKIE_NAME } from '../lib/csrf.js';
import { HTTP_STATUS } from '../lib/http-status.js';
import { HttpError } from '../lib/http-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { pickPresentStringFields, pickStringFields } from '../lib/request-body.js';
import { requireAuth } from '../middlewares/require-auth.js';
import { requireCsrf } from '../middlewares/require-csrf.js';
import type { Request, Response } from 'express';
import type { UserRepository } from '../repositories/user.repository.js';
import {
  toPublicUser,
  type AuthService,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput,
} from '../services/auth.service.js';

const UNAUTHENTICATED_MESSAGE = 'Not authenticated';

const REGISTER_FIELDS = [
  'phone',
  'firstName',
  'lastName',
  'city',
  'password',
  'confirmPassword',
  'categoryPreference',
] as const satisfies readonly (keyof RegisterInput)[];

const LOGIN_FIELDS = ['phone', 'password'] as const satisfies readonly (keyof LoginInput)[];

const UPDATE_PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'city',
  'address',
  'categoryPreference',
] as const satisfies readonly (keyof UpdateProfileInput)[];

function setSessionCookies(req: Request, res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  attachCsrfCookie(req, res, token);
}

/**
 * Only /register and /login sit behind the strict auth rate limiter (brute
 * force protection). /me is a lightweight session check the frontend fires
 * on nearly every page load, not a credential-guessing target, so it (and
 * /logout) use the caller-supplied general limiter instead — otherwise
 * ordinary browsing exhausts the same 30-requests-per-15-minutes budget.
 */
export function createAuthRouter(
  authService: AuthService,
  userRepository: UserRepository,
  authRateLimiter: RequestHandler,
  generalRateLimiter: RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/register',
    authRateLimiter,
    asyncHandler(async (req, res) => {
      const input = pickStringFields<RegisterInput>(req.body, REGISTER_FIELDS);
      const { user, token } = await authService.register(input);
      setSessionCookies(req, res, token);
      res.status(HTTP_STATUS.CREATED).json({ user });
    }),
  );

  router.post(
    '/login',
    authRateLimiter,
    asyncHandler(async (req, res) => {
      const input = pickStringFields<LoginInput>(req.body, LOGIN_FIELDS);
      const { user, token } = await authService.login(input);
      setSessionCookies(req, res, token);
      res.status(HTTP_STATUS.OK).json({ user });
    }),
  );

  router.post('/logout', generalRateLimiter, requireCsrf, (_req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    res.status(HTTP_STATUS.NO_CONTENT).end();
  });

  router.get(
    '/me',
    generalRateLimiter,
    requireAuth,
    asyncHandler(async (_req, res) => {
      const userId = res.locals['userId'] as string;
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new HttpError(UNAUTHENTICATED_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
      }
      res.status(HTTP_STATUS.OK).json({ user: toPublicUser(user) });
    }),
  );

  router.patch(
    '/me',
    generalRateLimiter,
    requireAuth,
    requireCsrf,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      const input = pickPresentStringFields<UpdateProfileInput>(req.body, UPDATE_PROFILE_FIELDS);
      const user = await authService.updateProfile(userId, input);
      res.status(HTTP_STATUS.OK).json({ user });
    }),
  );

  return router;
}
