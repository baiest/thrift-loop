import 'dotenv/config';
import { buildContainer } from './container.js';
import { createApp } from './create-app.js';

const DEFAULT_PORT = 3000;
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

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
const corsOrigin = process.env['CORS_ORIGIN'] ?? DEFAULT_CORS_ORIGIN;
const { authService, userRepository } = buildContainer();

createApp(authService, userRepository, corsOrigin).listen(port, () => {
  console.log(`API listening on port ${port}`);
});
