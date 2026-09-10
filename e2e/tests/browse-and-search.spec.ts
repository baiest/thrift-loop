import { test, expect } from '@playwright/test';
import { SELLER_STORAGE_STATE } from '../support/users.js';

test.describe('browsing and search (anonymous)', () => {
  test('shows the auctions grid and lets an anonymous visitor search', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('E2E No Bids Auction')).toBeVisible();
    await expect(page.getByText('E2E Realtime Auction')).toBeVisible();

    await page.getByRole('searchbox').fill('E2E Realtime');
    await expect(page.getByText('E2E Realtime Auction')).toBeVisible();
    await expect(page.getByText('E2E No Bids Auction')).toHaveCount(0);
  });
});

test.describe('browsing (logged in)', () => {
  test.use({ storageState: SELLER_STORAGE_STATE });

  test('defaults the city filter to the viewer profile city', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Remove Bogotá D.C. filter' })).toBeVisible();
  });
});
