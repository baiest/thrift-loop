import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import { createAuthRouter } from './routes/auth.routes.js';
import { HTTP_STATUS } from './lib/http-status.js';
import { createAuthRateLimiter } from './middlewares/rate-limit.js';
import type { UserRepository } from './repositories/user.repository.js';
import type { AuthService } from './services/auth.service.js';

export function createApp(
  authService: AuthService,
  userRepository: UserRepository,
  corsOrigin: string,
  authRateLimiter: RequestHandler = createAuthRateLimiter(),
): Express {
  const app = express();

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.status(HTTP_STATUS.OK).json({ status: 'ok' });
  });

  app.use('/auth', authRateLimiter, createAuthRouter(authService, userRepository));

  return app;
}
