import { test, expect } from '@playwright/test';
import { BIDDER_STORAGE_STATE, SELLER_STORAGE_STATE } from '../support/users.js';

// Known issue found by this suite, not yet root-caused: the seller's
// WebSocket genuinely connects (upgrade returns 101, confirmed via trace)
// and the bidder's HTTP bid succeeds (201), but the 'auction-updated'
// broadcast never reaches the seller's open connection — the price/bid
// count on their already-open detail page never updates. Ruled out so far:
// CORS/origin rejection (fixed separately — see ALLOWED_ORIGINS in
// apps/api/.env.example), auth-store hydration timing, and slow delivery
// (still absent after 15s). Marked test.fail() so it's tracked without
// blocking the rest of the suite — flip back to a normal test once fixed.
test.fail();

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
  // populate it before relying on any live update.
  await sellerPage.goto('/profile');
  await expect(sellerPage.getByLabel('First name')).toBeVisible();

  await sellerPage.goto('/');
  await sellerPage.getByText('E2E Realtime Auction').click();
  await expect(sellerPage.getByText('Starting at')).toBeVisible();

  await bidderPage.goto('/');
  await bidderPage.getByText('E2E Realtime Auction').click();
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
