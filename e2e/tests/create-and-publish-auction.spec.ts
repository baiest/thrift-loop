import { test, expect } from '@playwright/test';
import { SELLER_STORAGE_STATE } from '../support/users.js';

// A minimal 1x1 PNG, not a secret — just image bytes for the upload field.
const PNG_1X1_BASE64 =
  // eslint-disable-next-line no-secrets/no-secrets
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const PNG_1X1 = Buffer.from(PNG_1X1_BASE64, 'base64');

test.describe('create and publish an auction', () => {
  test.use({ storageState: SELLER_STORAGE_STATE });

  test('creates a draft through the wizard, then publishes it', async ({ page }) => {
    test.slow();
    const title = `E2E Wizard Auction ${Date.now()}`;

    await page.goto('/auctions/new');

    await page
      .getByLabel('Add photos')
      .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG_1X1 });
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Description').fill('Created end to end by the Playwright suite.');
    await page.getByLabel('Category').selectOption('jeans');
    await page.getByLabel('Condition').selectOption('good');
    await page.getByLabel('Delivery method').selectOption('pickup');
    const location = page.getByLabel('Location');
    await location.fill('Bogotá D.C.');
    await page.getByRole('button', { name: 'Bogotá D.C.' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('Price (COP)').fill('60000');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Schedule step defaults to "Publish now" — just continue.
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Review your listing' })).toBeVisible();
    // Fire-and-forget: this submit's onSubmit handler creates the auction
    // then navigates client-side (React Router). Something about that SPA
    // transition makes Playwright's own click()/dispatchEvent() wait hang
    // indefinitely here even though the action demonstrably completes (the
    // network calls fire and the page does navigate) — so don't await the
    // click itself, just wait for its observable effect (the URL changing).
    void page
      .getByRole('button', { name: 'Create auction' })
      .click()
      .catch(() => {});

    await expect(page).toHaveURL(/\/auctions\/AUC-/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await page.getByRole('button', { name: 'Publish now' }).click();
    await expect(page.getByRole('button', { name: 'Publish now' })).toHaveCount(0);

    await page.goto('/auctions/mine');
    const card = page.getByRole('link', { name: title });
    await expect(card.getByText('Draft')).toHaveCount(0);
  });
});
