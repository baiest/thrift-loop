import rateLimit, { type Options } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { HTTP_STATUS } from '../lib/http-status.js';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const TOO_MANY_REQUESTS_MESSAGE = 'Too many requests, try again later';

const AUTH_WINDOW_MINUTES = 15;
const AUTH_MAX_REQUESTS = 30;

// Auction/bid/notification traffic includes auction-detail-page.tsx's own
// live realtime subscription plus normal debounced search/filter/sort
// browsing — a strict window here trips on the app's own ordinary use, not
// just abuse.
const BROWSE_WINDOW_SECONDS = 60;
const BROWSE_MAX_REQUESTS = 120;

export const AUTH_RATE_LIMIT: Partial<Options> = {
  windowMs: AUTH_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
  limit: AUTH_MAX_REQUESTS,
};

export const BROWSE_RATE_LIMIT: Partial<Options> = {
  windowMs: BROWSE_WINDOW_SECONDS * MILLISECONDS_PER_SECOND,
  limit: BROWSE_MAX_REQUESTS,
};

export function createRateLimiter(options: Partial<Options> = {}): RequestHandler {
  return rateLimit({
    ...AUTH_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({ error: TOO_MANY_REQUESTS_MESSAGE });
    },
    ...options,
  });
}
