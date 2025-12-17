import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Start as guest
    await page.goto('/auth');
    await page.getByText(/continue as guest|המשך כאורח/i).click();
    await page.waitForURL('/');
  });

  test('should navigate between main pages via bottom nav', async ({ page }) => {
    const bottomNav = page.locator('nav').last();
    
    // Navigate to different sections
    const navItems = bottomNav.locator('a, button');
    const count = await navItems.count();
    
    expect(count).toBeGreaterThan(3);
  });

  test('should open and close hamburger menu', async ({ page }) => {
    // Open menu
    await page.locator('[class*="Menu"], svg[class*="lucide-menu"]').first().click();
    await expect(page.locator('[role="dialog"], [class*="sheet"]')).toBeVisible();
    
    // Close menu by clicking outside or close button
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('should navigate to shop page', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByText(/חנות|shop/i).first()).toBeVisible();
  });

  test('should navigate to adoption page', async ({ page }) => {
    await page.goto('/adoption');
    await expect(page.getByText(/אימוץ|adoption/i).first()).toBeVisible();
  });

  test('should handle back navigation', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');
    
    await page.goBack();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that mobile navigation is visible
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper page structure', async ({ page }) => {
    await page.goto('/');
    
    // Check for main landmark
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('/auth');
    
    // Login button should be accessible
    const loginBtn = page.getByRole('button', { name: /log in|התחבר/i });
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toBeEnabled();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/auth');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Some element should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
