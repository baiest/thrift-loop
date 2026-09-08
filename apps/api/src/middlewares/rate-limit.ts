import rateLimit, { type Options } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { HTTP_STATUS } from '../lib/http-status.js';

const WINDOW_MINUTES = 15;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const DEFAULT_WINDOW_MS = WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const DEFAULT_MAX_REQUESTS = 20;
const TOO_MANY_REQUESTS_MESSAGE = 'Too many requests, try again later';

export function createRateLimiter(options: Partial<Options> = {}): RequestHandler {
  return rateLimit({
    windowMs: DEFAULT_WINDOW_MS,
    max: DEFAULT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({ error: TOO_MANY_REQUESTS_MESSAGE });
    },
    ...options,
  });
}
