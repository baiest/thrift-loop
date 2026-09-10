import { test as setup, expect, type Page } from '@playwright/test';
import { BIDDER, BIDDER_STORAGE_STATE, SELLER, SELLER_STORAGE_STATE } from '../support/users.js';

async function loginAs(
  page: Page,
  credentials: { phone: string; password: string },
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Phone number').fill(credentials.phone);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  // The auctions page now mirrors its filters (including the profile's default
  // city) into the URL, so the post-login landing URL carries query params —
  // wait for navigation away from /login, then check the path only.
  await expect(page).not.toHaveURL(/\/login$/);
  expect(new URL(page.url()).pathname).toBe('/');
}

setup('authenticate as seller', async ({ page }) => {
  await loginAs(page, SELLER);
  await page.context().storageState({ path: SELLER_STORAGE_STATE });
});

setup('authenticate as bidder', async ({ page }) => {
  await loginAs(page, BIDDER);
  await page.context().storageState({ path: BIDDER_STORAGE_STATE });
});
