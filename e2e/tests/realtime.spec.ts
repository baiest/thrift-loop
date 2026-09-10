import { test, expect } from '@playwright/test';
import { BIDDER_STORAGE_STATE, SELLER_STORAGE_STATE } from '../support/users.js';

test('a bid placed by one browser updates another browser live, without a reload', async ({
  browser,
}) => {
  const sellerContext = await browser.newContext({ storageState: SELLER_STORAGE_STATE });
  const bidderContext = await browser.newContext({ storageState: BIDDER_STORAGE_STATE });
  const sellerPage = await sellerContext.newPage();
  const bidderPage = await bidderContext.newPage();

  // The realtime WebSocket only connects once the global auth store is
  // hydrated (RealtimeConnection reads useAuthStore, not a page's own local
  // state) — normally that happens via the login form. A session restored
  // from storageState skips that, so visit a guarded page once first to
  // populate it before relying on any live update. From there on, navigate
  // via in-app links, not page.goto() — goto() is a real browser navigation
  // (full reload), which would wipe the in-memory store right back out
  // (the home page never re-hydrates it), undoing the fix.
  await sellerPage.goto('/profile');
  await expect(sellerPage.getByLabel('First name')).toBeVisible();
  await sellerPage
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Auctions', exact: true })
    .click();
  await sellerPage.getByRole('link', { name: /E2E Realtime Auction/ }).click();
  await expect(sellerPage.getByRole('heading', { name: 'E2E Realtime Auction' })).toBeVisible();

  await bidderPage.goto('/profile');
  await expect(bidderPage.getByLabel('First name')).toBeVisible();
  await bidderPage
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Auctions', exact: true })
    .click();
  await bidderPage.getByRole('link', { name: /E2E Realtime Auction/ }).click();
  await expect(bidderPage.getByRole('heading', { name: 'E2E Realtime Auction' })).toBeVisible();
  await bidderPage.getByLabel('Your bid (COP)').fill('41000');
  await bidderPage.getByRole('button', { name: 'Place bid' }).click();
  await expect(bidderPage.getByText(/41[.,]000/).first()).toBeVisible();

  // The seller's page never reloads — this must arrive over the WebSocket.
  // A generous timeout: the round trip goes browser → API → event bus →
  // WebSocket hub → the other browser's React re-render.
  await expect(sellerPage.getByText('Current bid')).toBeVisible({ timeout: 15_000 });
  await expect(sellerPage.getByText(/41[.,]000/).first()).toBeVisible();

  await sellerContext.close();
  await bidderContext.close();
});
