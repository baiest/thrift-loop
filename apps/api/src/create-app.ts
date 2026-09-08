import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type Express, type RequestHandler } from 'express';
import { createAuthRouter } from './routes/auth.routes.js';
import { HTTP_STATUS } from './lib/http-status.js';
import { createAuthRateLimiter } from './middlewares/rate-limit.js';
import type { UserRepository } from './repositories/user.repository.js';
import type { AuthService } from './services/auth.service.js';

const API_PREFIX = '/api';
const INDEX_HTML = 'index.html';

function mountSpaFallback(app: Express, webDistPath: string): void {
  // webDistPath is trusted app configuration (from index.ts), never user input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!existsSync(webDistPath)) {
    return;
  }
  app.use(express.static(webDistPath));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(join(webDistPath, INDEX_HTML));
  });
}

export function createApp(
  authService: AuthService,
  userRepository: UserRepository,
  authRateLimiter: RequestHandler = createAuthRateLimiter(),
  webDistPath?: string,
): Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.status(HTTP_STATUS.OK).json({ status: 'ok' });
  });

  app.use(`${API_PREFIX}/auth`, authRateLimiter, createAuthRouter(authService, userRepository));

  if (webDistPath) {
    mountSpaFallback(app, webDistPath);
  }

  return app;
}
