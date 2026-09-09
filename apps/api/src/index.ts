import 'dotenv/config';
import { join } from 'node:path';
import { buildContainer } from './container.js';
import { createServer } from './create-server.js';
import { startAuctionScheduler } from './lib/publish-scheduler.js';

const DEFAULT_PORT = 3000;
const DEFAULT_WEB_DIST_PATH = '../web/dist';
const AUCTION_SCHEDULER_INTERVAL_MS = 60_000;
const DEFAULT_ALLOWED_ORIGINS = 'http://localhost:5173';

function requireEnv(name: string): string {
  // Only ever called with fixed literal names in this file, not user input.
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

requireEnv('JWT_SECRET');

const port = process.env['PORT'] ? Number(process.env['PORT']) : DEFAULT_PORT;
const webDistPath = join(process.cwd(), process.env['WEB_DIST_PATH'] ?? DEFAULT_WEB_DIST_PATH);
const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? DEFAULT_ALLOWED_ORIGINS)
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const {
  authService,
  userRepository,
  auctionService,
  bidService,
  notificationService,
  auctionRepository,
  bidRepository,
  mutex,
  eventBus,
  uploadsDir,
} = buildContainer();

const { server } = createServer({
  authService,
  userRepository,
  webDistPath,
  auctionService,
  bidService,
  notificationService,
  uploadsDir,
  allowedOrigins,
  eventBus,
});

server.listen(port, () => {
  console.log(`API listening on port ${port}`);
});

startAuctionScheduler(
  auctionRepository,
  bidRepository,
  mutex,
  eventBus,
  AUCTION_SCHEDULER_INTERVAL_MS,
);
