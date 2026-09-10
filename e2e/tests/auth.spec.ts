import { test, expect } from '@playwright/test';
import { SELLER } from '../support/users.js';

test.describe('auth', () => {
  test('registers a new user and lands on the home page', async ({ page }) => {
    const phone = `301${Date.now().toString().slice(-7)}`;

    await page.goto('/register');
    await page.getByLabel('Phone number').fill(phone);
    await page.getByLabel('First name').fill('Nueva');
    await page.getByLabel('Last name').fill('Usuaria');
    const city = page.getByLabel('City');
    await city.fill('Bogotá D.C.');
    await page.getByRole('button', { name: 'Bogotá D.C.' }).click();
    await page.getByLabel('Password', { exact: true }).fill('Abcdefg1');
    await page.getByLabel('Confirm password').fill('Abcdefg1');
    await page.getByRole('button', { name: 'Create account' }).click();

    // The auctions page mirrors filters (including the profile's default city)
    // into the URL, so the landing URL carries query params — match path only.
    await expect(page).not.toHaveURL(/\/register$/);
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('shows an error for an invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Phone number').fill('3009999999');
    await page.getByLabel('Password', { exact: true }).fill('WrongPassword1');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByRole('alert')).toHaveText('Phone number or password is incorrect');
    await expect(page).toHaveURL('/login');
  });

  test('logs in and out through the shell', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Phone number').fill(SELLER.phone);
    await page.getByLabel('Password', { exact: true }).fill(SELLER.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    expect(new URL(page.url()).pathname).toBe('/');

    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Log out' })
      .click();
    await expect(page).toHaveURL('/login');
  });
});
