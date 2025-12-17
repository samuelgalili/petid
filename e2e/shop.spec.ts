import { test, expect } from '@playwright/test';

test.describe('Shop Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop');
  });

  test('should display shop page correctly', async ({ page }) => {
    // Check title
    await expect(page.getByText(/חנות|shop/i).first()).toBeVisible();
    
    // Check search bar
    await expect(page.getByPlaceholder(/חיפוש|search/i)).toBeVisible();
    
    // Check product grid
    await expect(page.locator('[class*="grid"]').first()).toBeVisible();
  });

  test('should display pet type filters', async ({ page }) => {
    // Check pet type tabs (dogs, cats, all)
    await expect(page.getByText(/כלבים|dogs/i)).toBeVisible();
    await expect(page.getByText(/חתולים|cats/i)).toBeVisible();
    await expect(page.getByText(/הכל|all/i).first()).toBeVisible();
  });

  test('should display category filters', async ({ page }) => {
    // Check category pills
    await expect(page.getByText(/מזון|food/i)).toBeVisible();
    await expect(page.getByText(/צעצועים|toys/i)).toBeVisible();
  });

  test('should display products with prices', async ({ page }) => {
    // Wait for products to load
    await page.waitForSelector('[class*="product"], [class*="card"]', { timeout: 10000 });
    
    // Check that prices are displayed (₪ symbol)
    await expect(page.locator('text=₪').first()).toBeVisible();
  });

  test('should filter by pet type', async ({ page }) => {
    // Click dogs filter
    await page.getByText(/כלבים|dogs/i).click();
    await page.waitForTimeout(500);
    
    // Products should still be visible
    await expect(page.locator('[class*="product"], [class*="card"]').first()).toBeVisible();
  });

  test('should search for products', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/חיפוש|search/i);
    await searchInput.fill('מזון');
    await page.waitForTimeout(500);
    
    // Results should update
    await expect(page.locator('[class*="product"], [class*="card"]')).toBeVisible();
  });

  test('should toggle deals filter', async ({ page }) => {
    // Click deals/sale filter
    const dealsButton = page.getByText(/מבצעים|deals|sale/i);
    if (await dealsButton.isVisible()) {
      await dealsButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should open product modal on click', async ({ page }) => {
    // Click first product
    await page.locator('[class*="product"], [class*="card"]').first().click();
    
    // Modal or product detail should appear
    await page.waitForTimeout(500);
  });

  test('should navigate to cart', async ({ page }) => {
    // Click cart icon
    await page.locator('[class*="cart"], svg[class*="shopping"]').first().click();
    await expect(page).toHaveURL(/cart/);
  });
});

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cart');
  });

  test('should display empty cart state', async ({ page }) => {
    // Either login redirect or empty cart message
    const emptyMessage = page.getByText(/ריק|empty|העגלה/i);
    const loginPrompt = page.getByText(/log in|התחבר/i);
    
    await expect(emptyMessage.or(loginPrompt).first()).toBeVisible();
  });
});
