import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should display login page correctly', async ({ page }) => {
    // Check logo is visible
    await expect(page.locator('text=Pet')).toBeVisible();
    
    // Check login form elements
    await expect(page.getByPlaceholder(/phone number|מספר טלפון/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in|התחבר/i })).toBeVisible();
    
    // Check social login buttons
    await expect(page.getByText(/facebook/i)).toBeVisible();
    await expect(page.getByText(/google/i)).toBeVisible();
    
    // Check guest option
    await expect(page.getByText(/continue as guest|המשך כאורח/i)).toBeVisible();
  });

  test('should switch between email and phone tabs', async ({ page }) => {
    // Click email tab
    await page.getByRole('tab', { name: /email/i }).click();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    
    // Click phone tab
    await page.getByRole('tab', { name: /phone/i }).click();
    await expect(page.getByPlaceholder(/phone/i)).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.getByText(/sign up|הרשמה/i).click();
    await expect(page).toHaveURL(/signup/);
  });

  test('should continue as guest', async ({ page }) => {
    await page.getByText(/continue as guest|המשך כאורח/i).click();
    // Should redirect to feed
    await expect(page).toHaveURL('/');
  });

  test('should show validation error for empty phone', async ({ page }) => {
    await page.getByRole('button', { name: /log in|התחבר/i }).click();
    // Should show some validation feedback
    await expect(page.locator('.text-destructive, .text-red-500, [role="alert"]')).toBeVisible();
  });
});

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('should display signup form correctly', async ({ page }) => {
    await expect(page.getByPlaceholder(/full name|שם מלא/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/phone/i)).toBeVisible();
  });
});
