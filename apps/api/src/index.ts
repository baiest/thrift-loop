import 'dotenv/config';
import { join } from 'node:path';
import { buildContainer } from './container.js';
import { createServer } from './create-server.js';
import { startAuctionScheduler } from './lib/publish-scheduler.js';
import { setDefaultAsyncHandlerLogger } from './lib/async-handler.js';
import { setCsrfLogger } from './lib/csrf.js';

const DEFAULT_PORT = 3000;
const DEFAULT_WEB_DIST_PATH = '../web/dist';
const AUCTION_SCHEDULER_INTERVAL_MS = 60_000;
const HEARTBEAT_INTERVAL_MINUTES = 5;
const MILLISECONDS_PER_MINUTE = 60_000;
const HEARTBEAT_INTERVAL_MS = HEARTBEAT_INTERVAL_MINUTES * MILLISECONDS_PER_MINUTE;
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
  logger,
} = buildContainer();

setDefaultAsyncHandlerLogger(logger);
setCsrfLogger(logger);

process.on('uncaughtException', (error) => {
  logger.critical('uncaught_exception', { message: error.message, stack: error.stack });
  void logger.close().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.critical('unhandled_rejection', { message, stack });
  void logger.close().finally(() => process.exit(1));
});

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
  logger,
});

server.listen(port, () => {
  logger.info('server_started', { port });
});

startAuctionScheduler(
  auctionRepository,
  bidRepository,
  mutex,
  eventBus,
  AUCTION_SCHEDULER_INTERVAL_MS,
  logger,
);

setInterval(() => {
  logger.info('system_heartbeat', { uptimeSeconds: Math.round(process.uptime()) });
}, HEARTBEAT_INTERVAL_MS);
