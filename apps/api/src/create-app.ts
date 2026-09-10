import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type Express, type RequestHandler } from 'express';
import { createAuthRouter } from './routes/auth.routes.js';
import { createAuctionRouter } from './routes/auction.routes.js';
import { createNotificationRouter } from './routes/notification.routes.js';
import { HTTP_STATUS } from './lib/http-status.js';
import { AUTH_RATE_LIMIT, BROWSE_RATE_LIMIT, createRateLimiter } from './middlewares/rate-limit.js';
import { createRequestLoggingMiddleware } from './middlewares/request-logging.js';
import { NOOP_LOGGER, type Logger } from './lib/logger.js';
import type { UserRepository } from './repositories/user.repository.js';
import type { AuthService } from './services/auth.service.js';
import type { AuctionService } from './services/auction.service.js';
import type { BidService } from './services/bid.service.js';
import type { NotificationService } from './services/notification.service.js';

const API_PREFIX = '/api';
const INDEX_HTML = 'index.html';
const UPLOADS_URL_PATH = '/uploads';

export interface CreateAppOptions {
  authService: AuthService;
  userRepository: UserRepository;
  authRateLimiter?: RequestHandler;
  webDistPath?: string;
  auctionService?: AuctionService;
  bidService?: BidService;
  notificationService?: NotificationService;
  uploadsDir?: string;
  auctionRateLimiter?: RequestHandler;
  notificationRateLimiter?: RequestHandler;
  logger?: Logger;
}

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

function mountUploads(app: Express, uploadsDir: string): void {
  // uploadsDir is trusted app configuration (from index.ts), never user input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!existsSync(uploadsDir)) {
    return;
  }
  app.use(UPLOADS_URL_PATH, express.static(uploadsDir));
}

export function createApp(options: CreateAppOptions): Express {
  const {
    authService,
    userRepository,
    authRateLimiter = createRateLimiter(AUTH_RATE_LIMIT),
    webDistPath,
    auctionService,
    bidService,
    notificationService,
    uploadsDir,
    auctionRateLimiter = createRateLimiter(BROWSE_RATE_LIMIT),
    notificationRateLimiter = createRateLimiter(BROWSE_RATE_LIMIT),
    logger = NOOP_LOGGER,
  } = options;

  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(createRequestLoggingMiddleware(logger));

  app.get('/health', (_req, res) => {
    res.status(HTTP_STATUS.OK).json({ status: 'ok' });
  });

  app.use(`${API_PREFIX}/auth`, authRateLimiter, createAuthRouter(authService, userRepository));

  if (auctionService) {
    app.use(
      `${API_PREFIX}/auctions`,
      auctionRateLimiter,
      createAuctionRouter(auctionService, userRepository, bidService),
    );
  }

  if (notificationService) {
    app.use(
      `${API_PREFIX}/notifications`,
      notificationRateLimiter,
      createNotificationRouter(notificationService),
    );
  }

  if (uploadsDir) {
    mountUploads(app, uploadsDir);
  }

  if (webDistPath) {
    mountSpaFallback(app, webDistPath);
  }

  return app;
}
