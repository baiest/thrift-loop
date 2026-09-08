import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type Express, type RequestHandler } from 'express';
import { createAuthRouter } from './routes/auth.routes.js';
import { createAuctionRouter } from './routes/auction.routes.js';
import { HTTP_STATUS } from './lib/http-status.js';
import { createRateLimiter } from './middlewares/rate-limit.js';
import type { UserRepository } from './repositories/user.repository.js';
import type { AuthService } from './services/auth.service.js';
import type { AuctionService } from './services/auction.service.js';
import type { BidService } from './services/bid.service.js';

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
  uploadsDir?: string;
  auctionRateLimiter?: RequestHandler;
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
    authRateLimiter = createRateLimiter(),
    webDistPath,
    auctionService,
    bidService,
    uploadsDir,
    auctionRateLimiter = createRateLimiter(),
  } = options;

  const app = express();

  app.use(express.json());
  app.use(cookieParser());

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

  if (uploadsDir) {
    mountUploads(app, uploadsDir);
  }

  if (webDistPath) {
    mountSpaFallback(app, webDistPath);
  }

  return app;
}
