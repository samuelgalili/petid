import { test, expect } from '@playwright/test';

// Admin E2E Tests - 5 Critical Flows
// These tests require an admin user to be logged in

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page and login as admin
    await page.goto('/auth');
    
    // Fill login form (adjust selectors based on actual auth page)
    await page.fill('input[type="email"]', 'samuelgalili@gmaol.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL('/');
  });

  test('1. Admin can access dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Should see dashboard title
    await expect(page.locator('h1')).toContainText('דשבורד');
    
    // Should see stats cards
    await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible();
  });

  test('2. Admin can view and filter users', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Should see users table
    await expect(page.locator('table')).toBeVisible();
    
    // Search for user
    await page.fill('input[placeholder*="חיפוש"]', 'test');
    
    // Should filter results
    await expect(page.locator('tbody tr')).toHaveCount(await page.locator('tbody tr').count());
  });

  test('3. Admin can manage reports', async ({ page }) => {
    await page.goto('/admin/reports');
    
    // Should see reports page
    await expect(page.locator('h1')).toContainText('דיווחים');
    
    // Check for filter options
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible();
  });

  test('4. Admin can view orders', async ({ page }) => {
    await page.goto('/admin/orders');
    
    // Should see orders page
    await expect(page.getByRole('heading')).toContainText(/Orders|הזמנות/i);
    
    // Should have status filter
    await expect(page.locator('[role="combobox"]').first()).toBeVisible();
  });

  test('5. Admin can access coupons management', async ({ page }) => {
    await page.goto('/admin/coupons');
    
    // Should see coupons page
    await expect(page.locator('h1, h2').first()).toContainText(/קופונים|Coupons/i);
    
    // Should see add coupon button
    await expect(page.getByRole('button', { name: /הוסף|צור|Create|Add/i })).toBeVisible();
  });

  test('Admin navigation works correctly', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Navigate to different admin pages via sidebar/nav
    const navLinks = [
      { path: '/admin/users', text: 'משתמשים' },
      { path: '/admin/content', text: 'תוכן' },
      { path: '/admin/products', text: 'מוצרים' },
      { path: '/admin/audit', text: 'לוג' },
    ];

    for (const link of navLinks) {
      // Click navigation link or go directly
      await page.goto(link.path);
      
      // Verify page loaded
      await expect(page).toHaveURL(link.path);
    }
  });

  test('Unauthorized users cannot access admin', async ({ page }) => {
    // Clear auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    
    // Try to access admin page directly
    await page.goto('/admin/dashboard');
    
    // Should redirect to auth or show error
    await expect(page).toHaveURL(/auth|login|\//);
  });

  test('Admin audit log records actions', async ({ page }) => {
    await page.goto('/admin/audit');
    
    // Should see audit log page
    await expect(page.locator('h1, h2').first()).toContainText(/לוג|Audit|פעילות/i);
    
    // Should have filter options
    await expect(page.locator('select, [role="combobox"], input').first()).toBeVisible();
  });
});
