import { test, expect } from '@playwright/test';
import { BIDDER_STORAGE_STATE, SELLER_STORAGE_STATE } from '../support/users.js';

test.describe('notifications', () => {
  test.use({ storageState: SELLER_STORAGE_STATE });

  test('bell badge increments after a bid on the seller listing', async ({ page, browser }) => {
    const bidderContext = await browser.newContext({ storageState: BIDDER_STORAGE_STATE });
    const bidderPage = await bidderContext.newPage();
    await bidderPage.goto('/');
    await bidderPage.getByText('E2E Notifications Auction').click();
    await bidderPage.getByLabel('Your bid (COP)').fill('40000');
    await bidderPage.getByRole('button', { name: 'Place bid' }).click();
    await expect(bidderPage.getByText(/40[.,]000/).first()).toBeVisible();
    await bidderContext.close();

    await page.goto('/notifications');
    await expect(page.getByText(/bid.*E2E Notifications Auction/)).toBeVisible();
  });
});

test.describe('profile', () => {
  test.use({ storageState: SELLER_STORAGE_STATE });

  test('toggling a notification preference persists across reload', async ({ page }) => {
    await page.goto('/profile');
    const toggle = page.getByRole('switch', { name: 'Someone bid on my listing' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.reload();
    await expect(page.getByRole('switch', { name: 'Someone bid on my listing' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    // Restore the default so a rerun of the suite starts from a clean state.
    await page.getByRole('switch', { name: 'Someone bid on my listing' }).click();
  });

  test('editing a profile field saves', async ({ page }) => {
    await page.goto('/profile');

    const firstName = page.getByLabel('First name');
    await firstName.fill('Sonia Editada');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Saved.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('First name')).toHaveValue('Sonia Editada');
  });
});
