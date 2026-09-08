import 'dotenv/config';
import { join } from 'node:path';
import { buildContainer } from './container.js';
import { createApp } from './create-app.js';
import { startPublishScheduler } from './lib/publish-scheduler.js';

const DEFAULT_PORT = 3000;
const DEFAULT_WEB_DIST_PATH = '../web/dist';
const PUBLISH_SCHEDULER_INTERVAL_MS = 60_000;

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
const { authService, userRepository, auctionService, auctionRepository, uploadsDir } =
  buildContainer();

createApp(authService, userRepository, undefined, webDistPath, auctionService, uploadsDir).listen(
  port,
  () => {
    console.log(`API listening on port ${port}`);
  },
);

startPublishScheduler(auctionRepository, PUBLISH_SCHEDULER_INTERVAL_MS);
