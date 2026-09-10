import { test, expect } from '@playwright/test';
import { BIDDER_STORAGE_STATE, SELLER_STORAGE_STATE } from '../support/users.js';

test.describe('bidding', () => {
  test.use({ storageState: BIDDER_STORAGE_STATE });

  test('rejects a bid below the minimum', async ({ page }) => {
    await page.goto('/');
    await page.getByText('E2E No Bids Auction').click();

    await page.getByLabel('Your bid (COP)').fill('1000');
    await page.getByRole('button', { name: 'Place bid' }).click();

    await expect(page.getByRole('alert')).toContainText('Enter a whole number of at least');
  });

  test('places a valid bid and shows it in the bid history', async ({ page }) => {
    await page.goto('/');
    await page.getByText('E2E No Bids Auction').click();

    await page.getByLabel('Your bid (COP)').fill('42000');
    await page.getByRole('button', { name: 'Place bid' }).click();

    await expect(page.getByText(/42[.,]000/).first()).toBeVisible();
  });

  test('rejects the seller bidding on their own auction', async ({ browser }) => {
    const sellerContext = await browser.newContext({ storageState: SELLER_STORAGE_STATE });
    const page = await sellerContext.newPage();

    await page.goto('/');
    await page.getByText('E2E No Bids Auction').click();

    await expect(page.getByRole('button', { name: 'Place bid' })).toHaveCount(0);

    await sellerContext.close();
  });
});
