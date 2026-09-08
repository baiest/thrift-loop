import { Router } from 'express';
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { CSRF_COOKIE_NAME, generateCsrfToken, getCsrfCookieOptions } from '../lib/csrf.js';
import { HTTP_STATUS } from '../lib/http-status.js';
import { HttpError } from '../lib/http-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { pickStringFields } from '../lib/request-body.js';
import { requireAuth } from '../middlewares/require-auth.js';
import { requireCsrf } from '../middlewares/require-csrf.js';
import type { Response } from 'express';
import type { UserRepository } from '../repositories/user.repository.js';
import {
  toPublicUser,
  type AuthService,
  type LoginInput,
  type RegisterInput,
} from '../services/auth.service.js';

const UNAUTHENTICATED_MESSAGE = 'Not authenticated';

const REGISTER_FIELDS = [
  'phone',
  'firstName',
  'lastName',
  'city',
  'password',
  'confirmPassword',
] as const satisfies readonly (keyof RegisterInput)[];

const LOGIN_FIELDS = ['phone', 'password'] as const satisfies readonly (keyof LoginInput)[];

function setSessionCookies(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), getCsrfCookieOptions());
}

export function createAuthRouter(authService: AuthService, userRepository: UserRepository): Router {
  const router = Router();

  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      const input = pickStringFields<RegisterInput>(req.body, REGISTER_FIELDS);
      const { user, token } = await authService.register(input);
      setSessionCookies(res, token);
      res.status(HTTP_STATUS.CREATED).json({ user });
    }),
  );

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const input = pickStringFields<LoginInput>(req.body, LOGIN_FIELDS);
      const { user, token } = await authService.login(input);
      setSessionCookies(res, token);
      res.status(HTTP_STATUS.OK).json({ user });
    }),
  );

  router.post('/logout', requireCsrf, (_req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    res.status(HTTP_STATUS.NO_CONTENT).end();
  });

  router.get(
    '/me',
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

  return router;
}
