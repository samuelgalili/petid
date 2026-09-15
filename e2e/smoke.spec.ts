import { test, expect } from '@playwright/test';

/**
 * Required CI gate. Keep this file free of live-backend / authenticated flows.
 * Auth and signup pages show a ~3s splash skeleton before content.
 */
test.describe('CI smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mipo-onboarding-complete', 'true');
    });
  });

  test('serves the SPA shell @smoke', async ({ page }) => {
    const response = await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('#root')).toBeAttached();
  });

  test('auth page renders after splash @smoke', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'ברוכים הבאים' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'שלח קוד אימות' })).toBeVisible();
  });

  test('signup page is reachable from auth @smoke', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'הרשמה' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('link', { name: 'הרשמה' }).click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole('heading', { name: 'הצטרפו לפטיד' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('terms page renders static copy @smoke', async ({ page }) => {
    await page.goto('/terms', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'תקנון ותנאי שימוש' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('privacy page renders static copy @smoke', async ({ page }) => {
    await page.goto('/privacy-policy', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'מדיניות פרטיות' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('unauthenticated home redirects to auth @smoke', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth/, { timeout: 20_000 });
  });
});
