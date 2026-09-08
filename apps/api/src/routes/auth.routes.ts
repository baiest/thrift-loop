import { Router, type Request, type Response } from 'express';
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { HTTP_STATUS } from '../lib/http-status.js';
import { requireAuth } from '../middlewares/require-auth.js';
import type { UserRepository } from '../repositories/user.repository.js';
import {
  AuthError,
  AuthService,
  toPublicUser,
  type LoginInput,
  type RegisterInput,
} from '../services/auth.service.js';

const UNAUTHENTICATED_MESSAGE = 'Not authenticated';
const UNEXPECTED_ERROR_MESSAGE = 'Something went wrong';

function readStringField(body: Record<string, unknown>, key: string): string {
  // key is always one of a small set of literal field names passed by this file,
  // never derived from request data itself.
  // eslint-disable-next-line security/detect-object-injection
  const value = body[key];
  return typeof value === 'string' ? value : '';
}

function parseRegisterInput(body: unknown): RegisterInput {
  const source = (body ?? {}) as Record<string, unknown>;
  return {
    phone: readStringField(source, 'phone'),
    firstName: readStringField(source, 'firstName'),
    lastName: readStringField(source, 'lastName'),
    city: readStringField(source, 'city'),
    password: readStringField(source, 'password'),
    confirmPassword: readStringField(source, 'confirmPassword'),
  };
}

function parseLoginInput(body: unknown): LoginInput {
  const source = (body ?? {}) as Record<string, unknown>;
  return {
    phone: readStringField(source, 'phone'),
    password: readStringField(source, 'password'),
  };
}

function sendAuthError(res: Response, error: unknown): void {
  if (error instanceof AuthError) {
    res.status(error.status).json({ error: error.message, fields: error.fields });
    return;
  }
  // Express 4 does not catch rejections thrown from an async handler on its own,
  // so an unexpected error must be turned into a response here, not re-thrown.
  console.error('Unexpected auth error', error);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: UNEXPECTED_ERROR_MESSAGE });
}

export function createAuthRouter(authService: AuthService, userRepository: UserRepository): Router {
  const router = Router();

  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { user, token } = await authService.register(parseRegisterInput(req.body));
      res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
      res.status(HTTP_STATUS.CREATED).json({ user });
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { user, token } = await authService.login(parseLoginInput(req.body));
      res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
      res.status(HTTP_STATUS.OK).json({ user });
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.status(HTTP_STATUS.NO_CONTENT).end();
  });

  router.get('/me', requireAuth, async (_req: Request, res: Response) => {
    const userId = res.locals['userId'] as string;
    const user = await userRepository.findById(userId);
    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: UNAUTHENTICATED_MESSAGE });
      return;
    }
    res.status(HTTP_STATUS.OK).json({ user: toPublicUser(user) });
  });

  return router;
}
