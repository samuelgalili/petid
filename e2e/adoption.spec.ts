import { test, expect } from '@playwright/test';

test.describe('Adoption Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/adoption');
  });

  test('should display adoption page correctly', async ({ page }) => {
    // Check page title/header
    await expect(page.getByText(/אימוץ|adoption|בית חם/i).first()).toBeVisible();
    
    // Check search functionality
    await expect(page.getByPlaceholder(/חיפוש|search/i)).toBeVisible();
  });

  test('should display pet cards', async ({ page }) => {
    // Wait for pet cards to load
    await page.waitForSelector('[class*="card"], [class*="pet"]', { timeout: 10000 });
    
    // Check that pet cards are visible
    const petCards = page.locator('[class*="card"]');
    await expect(petCards.first()).toBeVisible();
  });

  test('should display pet information on cards', async ({ page }) => {
    await page.waitForSelector('[class*="card"]', { timeout: 10000 });
    
    // Pet cards should show: name, breed, age
    const firstCard = page.locator('[class*="card"]').first();
    await expect(firstCard).toBeVisible();
  });

  test('should have filter dropdowns', async ({ page }) => {
    // Check size filter
    await expect(page.getByText(/גודל|size|כל הגדלים/i)).toBeVisible();
    
    // Check type filter
    await expect(page.getByText(/סוג|type|כל הסוגים/i)).toBeVisible();
  });

  test('should filter by pet type', async ({ page }) => {
    // Click type filter dropdown
    const typeFilter = page.locator('select, [role="combobox"]').first();
    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await page.waitForTimeout(300);
    }
  });

  test('should have adopt button on pet cards', async ({ page }) => {
    await page.waitForSelector('[class*="card"]', { timeout: 10000 });
    
    // Check for adopt button
    await expect(page.getByText(/אמץ אותי|adopt me/i).first()).toBeVisible();
  });

  test('should search for pets', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/חיפוש|search/i);
    await searchInput.fill('לונה');
    await page.waitForTimeout(500);
    
    // Results should update
    await expect(page.locator('[class*="card"]')).toBeVisible();
  });

  test('should show adoption form on adopt click', async ({ page }) => {
    await page.waitForSelector('[class*="card"]', { timeout: 10000 });
    
    // Click adopt button
    await page.getByText(/אמץ אותי|adopt me/i).first().click();
    
    // Should show form or login prompt
    await page.waitForTimeout(500);
    const dialog = page.locator('[role="dialog"], [class*="dialog"], [class*="sheet"]');
    const loginPrompt = page.getByText(/התחבר|log in/i);
    
    await expect(dialog.or(loginPrompt).first()).toBeVisible();
  });
});
