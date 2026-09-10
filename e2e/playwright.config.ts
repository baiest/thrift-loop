import { defineConfig, devices } from '@playwright/test';

const DEFAULT_BASE_URL = 'http://localhost:3000';
const baseURL = process.env['E2E_BASE_URL'] ?? DEFAULT_BASE_URL;
const WEB_SERVER_TIMEOUT_MS = 180_000;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  outputDir: './test-results',
  reporter: [['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run e2e:server',
    cwd: '..',
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env['CI'],
    timeout: WEB_SERVER_TIMEOUT_MS,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
