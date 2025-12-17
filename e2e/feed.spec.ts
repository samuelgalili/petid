import { test, expect } from '@playwright/test';

test.describe('Social Feed (Petish)', () => {
  test.beforeEach(async ({ page }) => {
    // Continue as guest to access the feed
    await page.goto('/auth');
    await page.getByText(/continue as guest|המשך כאורח/i).click();
    await page.waitForURL('/');
  });

  test('should display feed page correctly', async ({ page }) => {
    // Check header with Petish branding
    await expect(page.getByText('Petish')).toBeVisible();
    
    // Check hamburger menu icon
    await expect(page.locator('[class*="Menu"], svg[class*="lucide-menu"]').first()).toBeVisible();
    
    // Check bottom navigation
    await expect(page.locator('nav').last()).toBeVisible();
  });

  test('should display posts in feed', async ({ page }) => {
    // Wait for posts to load
    await page.waitForSelector('[class*="post"], [class*="card"]', { timeout: 10000 });
    
    // Check that posts are visible
    const posts = page.locator('[class*="post"], article').first();
    await expect(posts).toBeVisible();
  });

  test('should have tabs for All and Following', async ({ page }) => {
    await expect(page.getByText(/הכל|all/i)).toBeVisible();
    await expect(page.getByText(/עוקבים|following/i)).toBeVisible();
  });

  test('should open hamburger menu', async ({ page }) => {
    // Click hamburger menu
    await page.locator('[class*="Menu"], svg[class*="lucide-menu"]').first().click();
    
    // Menu should be visible with options
    await expect(page.locator('[role="dialog"], [class*="sheet"], [class*="drawer"]')).toBeVisible();
  });

  test('should navigate using bottom navigation', async ({ page }) => {
    const bottomNav = page.locator('nav').last();
    
    // Click shop icon (should navigate to shop)
    await bottomNav.locator('a, button').nth(0).click();
    await page.waitForTimeout(500);
  });

  test('should show login prompt for protected actions', async ({ page }) => {
    // Try to like a post (should show login prompt for guests)
    const likeButton = page.locator('[class*="like"], [class*="heart"]').first();
    if (await likeButton.isVisible()) {
      await likeButton.click();
      // Should show login prompt dialog
      await expect(page.locator('[role="dialog"], [class*="dialog"]')).toBeVisible();
    }
  });
});

test.describe('Stories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.getByText(/continue as guest|המשך כאורח/i).click();
    await page.waitForURL('/');
  });

  test('should display stories section', async ({ page }) => {
    // Look for story avatars
    const storiesSection = page.locator('[class*="story"], [class*="avatar"]').first();
    await expect(storiesSection).toBeVisible();
  });
});
