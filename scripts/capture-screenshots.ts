import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';

const OUT_DIR = join(import.meta.dirname, '..', 'docs', 'assets');
const SCREENSHOT_BASE_URL_ENV_VAR = 'SCREENSHOT_BASE_URL';
// eslint-disable-next-line security/detect-object-injection -- key is a repo-fixed constant
const LIVE_URL = process.env[SCREENSHOT_BASE_URL_ENV_VAR] ?? 'https://thrift-loop.onrender.com';
const COLD_START_TIMEOUT_MS = 60_000;
const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;
const VIEWPORT = { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT };
const RENDER_SETTLE_DELAY_MS = 500;

async function gotoWithColdStartRetry(page: Page, path: string): Promise<void> {
  await page.goto(`${LIVE_URL}${path}`, {
    waitUntil: 'networkidle',
    timeout: COLD_START_TIMEOUT_MS,
  });
}

const AUCTION_CARD_LINK = 'a[href^="/auctions/"]';

async function hasAuctionCards(page: Page): Promise<boolean> {
  const count = await page.locator(AUCTION_CARD_LINK).count();
  return count > 0;
}

async function capture(page: Page, path: string, fileName: string): Promise<void> {
  await gotoWithColdStartRetry(page, path);
  await page.waitForTimeout(RENDER_SETTLE_DELAY_MS);
  await page.screenshot({ path: join(OUT_DIR, fileName), fullPage: false });
  console.log(`Captured ${fileName}`);
}

async function main(): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- OUT_DIR is a repo-fixed constant
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });

    await capture(page, '/', 'grid.png');

    if (!(await hasAuctionCards(page))) {
      console.warn(
        'No auction cards found on the live grid (Render free tier has no persistent ' +
          'storage — data resets on redeploy/restart). Run `npm run e2e:server` locally ' +
          `and re-run with ${SCREENSHOT_BASE_URL_ENV_VAR}=http://localhost:3000 for ` +
          'populated screenshots.',
      );
    } else {
      const firstCard = page.locator(AUCTION_CARD_LINK).first();
      await firstCard.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(RENDER_SETTLE_DELAY_MS);
      await page.screenshot({ path: join(OUT_DIR, 'auction-detail.png') });
      console.log('Captured auction-detail.png');
    }

    await capture(page, '/login', 'login.png');
  } finally {
    await browser.close();
  }
}

await main();
