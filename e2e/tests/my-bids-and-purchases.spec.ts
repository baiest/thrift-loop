import { test, expect } from '@playwright/test';
import { BIDDER_STORAGE_STATE } from '../support/users.js';

test.describe('my bids and purchases', () => {
  test.use({ storageState: BIDDER_STORAGE_STATE });

  test('shows "Won" for the sold auction on My bids', async ({ page }) => {
    await page.goto('/my-bids');

    const card = page.getByRole('link', { name: /E2E Sold Auction/ });
    await expect(card.getByText('Won')).toBeVisible();
  });

  test('lists the sold auction on Purchases with its handover info', async ({ page }) => {
    await page.goto('/purchases');

    await expect(page.getByText(/35[.,]000/)).toBeVisible();
    await expect(page.getByText('Pick up in: Bogotá D.C.')).toBeVisible();
  });
});
