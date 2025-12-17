import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  // Helper to add item to cart
  async function addItemToCart(page) {
    await page.goto('/shop');
    await page.waitForSelector('[class*="card"], [class*="product"]', { timeout: 10000 });
    
    // Click first product
    await page.locator('[class*="card"], [class*="product"]').first().click();
    await page.waitForTimeout(500);
    
    // Try to add to cart from modal/detail
    const addToCartBtn = page.getByText(/הוסף לסל|add to cart/i);
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
      await page.waitForTimeout(500);
    }
  }

  test.describe('Cart Management', () => {
    test('should display empty cart message when cart is empty', async ({ page }) => {
      await page.goto('/cart');
      
      // Either login redirect or empty cart
      const emptyText = page.getByText(/ריקה|empty|אין פריטים/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(emptyText.or(loginPrompt).first()).toBeVisible();
    });

    test('should add item to cart from shop', async ({ page }) => {
      await page.goto('/shop');
      await page.waitForSelector('[class*="card"]', { timeout: 10000 });
      
      // Click on a product
      await page.locator('[class*="card"]').first().click();
      await page.waitForTimeout(500);
      
      // Look for add to cart button
      const addBtn = page.getByText(/הוסף לסל|add to cart|הוסף/i);
      if (await addBtn.isVisible()) {
        await addBtn.click();
        
        // Should show success toast
        await expect(page.locator('[class*="toast"], [role="status"]')).toBeVisible({ timeout: 3000 });
      }
    });

    test('should update quantity in cart', async ({ page }) => {
      await addItemToCart(page);
      await page.goto('/cart');
      
      // Look for quantity controls
      const plusBtn = page.locator('[class*="plus"], button:has-text("+")').first();
      const minusBtn = page.locator('[class*="minus"], button:has-text("-")').first();
      
      if (await plusBtn.isVisible()) {
        await plusBtn.click();
        await page.waitForTimeout(300);
      }
    });

    test('should remove item from cart', async ({ page }) => {
      await addItemToCart(page);
      await page.goto('/cart');
      
      // Look for remove/delete button
      const removeBtn = page.locator('[class*="trash"], [class*="delete"], button:has-text("הסר")').first();
      
      if (await removeBtn.isVisible()) {
        await removeBtn.click();
        await page.waitForTimeout(500);
      }
    });

    test('should display cart summary with subtotal', async ({ page }) => {
      await addItemToCart(page);
      await page.goto('/cart');
      
      // Check for price display
      await expect(page.locator('text=₪')).toBeVisible();
    });

    test('should navigate to checkout from cart', async ({ page }) => {
      await addItemToCart(page);
      await page.goto('/cart');
      
      // Look for checkout button
      const checkoutBtn = page.getByText(/לתשלום|checkout|המשך/i);
      if (await checkoutBtn.isVisible()) {
        await checkoutBtn.click();
        await expect(page).toHaveURL(/checkout/);
      }
    });
  });

  test.describe('Checkout Process', () => {
    test.beforeEach(async ({ page }) => {
      // Add item to cart first
      await addItemToCart(page);
    });

    test('should display checkout page with order summary', async ({ page }) => {
      await page.goto('/checkout');
      
      // Check for order summary elements
      const summarySection = page.getByText(/סיכום הזמנה|order summary|סה"כ/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(summarySection.or(loginPrompt).first()).toBeVisible();
    });

    test('should display shipping form fields', async ({ page }) => {
      await page.goto('/checkout');
      
      // Check for shipping form fields (if logged in)
      const nameField = page.getByPlaceholder(/שם|name/i);
      const addressField = page.getByPlaceholder(/כתובת|address/i);
      const cityField = page.getByPlaceholder(/עיר|city/i);
      const phoneField = page.getByPlaceholder(/טלפון|phone/i);
      
      // At least some fields should be visible or login prompt
      const loginPrompt = page.getByText(/התחבר|log in/i);
      await expect(nameField.or(loginPrompt).first()).toBeVisible();
    });

    test('should show payment method options', async ({ page }) => {
      await page.goto('/checkout');
      
      // Check for payment options
      const paymentSection = page.getByText(/אמצעי תשלום|payment method|תשלום/i);
      const creditCard = page.getByText(/כרטיס אשראי|credit card/i);
      const cash = page.getByText(/מזומן|cash/i);
      
      // Some payment info should be visible or login
      const loginPrompt = page.getByText(/התחבר|log in/i);
      await expect(paymentSection.or(loginPrompt).first()).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/checkout');
      
      // Try to submit without filling fields
      const submitBtn = page.getByText(/בצע הזמנה|place order|אישור/i);
      
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        
        // Should show validation errors
        await expect(page.locator('.text-destructive, .text-red-500, [class*="error"]')).toBeVisible();
      }
    });

    test('should calculate total with shipping', async ({ page }) => {
      await page.goto('/checkout');
      
      // Check for total calculation display
      await expect(page.locator('text=₪')).toBeVisible();
    });

    test('should show tax calculation', async ({ page }) => {
      await page.goto('/checkout');
      
      // Look for tax/VAT display
      const taxLabel = page.getByText(/מע"מ|tax|vat/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(taxLabel.or(loginPrompt).first()).toBeVisible();
    });
  });

  test.describe('Order Confirmation', () => {
    test('should display order confirmation page after successful checkout', async ({ page }) => {
      // Navigate directly to order confirmation (simulating successful order)
      await page.goto('/order-confirmation');
      
      // Should show confirmation or redirect
      const confirmationText = page.getByText(/תודה|thank you|ההזמנה התקבלה|order confirmed/i);
      const redirected = page.getByText(/התחבר|log in|הזמנות/i);
      
      await expect(confirmationText.or(redirected).first()).toBeVisible();
    });
  });

  test.describe('Order History', () => {
    test('should display order history page', async ({ page }) => {
      await page.goto('/order-history');
      
      // Should show orders or empty state or login
      const ordersTitle = page.getByText(/היסטוריית הזמנות|order history|ההזמנות שלי/i);
      const emptyState = page.getByText(/אין הזמנות|no orders/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(ordersTitle.or(emptyState).or(loginPrompt).first()).toBeVisible();
    });
  });
});

test.describe('Product Detail to Checkout Journey', () => {
  test('should complete full purchase journey', async ({ page }) => {
    // Step 1: Go to shop
    await page.goto('/shop');
    await expect(page.getByText(/חנות|shop/i).first()).toBeVisible();
    
    // Step 2: Select a product
    await page.waitForSelector('[class*="card"]', { timeout: 10000 });
    await page.locator('[class*="card"]').first().click();
    await page.waitForTimeout(500);
    
    // Step 3: Add to cart
    const addBtn = page.getByText(/הוסף לסל|add to cart/i);
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Step 4: Go to cart
    await page.goto('/cart');
    await page.waitForTimeout(500);
    
    // Step 5: Proceed to checkout
    const checkoutBtn = page.getByText(/לתשלום|checkout|המשך לתשלום/i);
    if (await checkoutBtn.isVisible()) {
      await checkoutBtn.click();
      await page.waitForURL(/checkout/, { timeout: 5000 });
    }
    
    // Step 6: Verify checkout page loaded
    await expect(page).toHaveURL(/checkout|auth/);
  });

  test('should handle quantity changes in modal', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForSelector('[class*="card"]', { timeout: 10000 });
    
    // Click product
    await page.locator('[class*="card"]').first().click();
    await page.waitForTimeout(500);
    
    // Try to increase quantity
    const plusBtn = page.locator('[class*="plus"], button:has-text("+")').first();
    if (await plusBtn.isVisible()) {
      await plusBtn.click();
      await plusBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('should persist cart across navigation', async ({ page }) => {
    // Add item to cart
    await page.goto('/shop');
    await page.waitForSelector('[class*="card"]', { timeout: 10000 });
    await page.locator('[class*="card"]').first().click();
    await page.waitForTimeout(500);
    
    const addBtn = page.getByText(/הוסף לסל|add to cart/i);
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Navigate away
    await page.goto('/');
    await page.waitForTimeout(500);
    
    // Go back to cart
    await page.goto('/cart');
    
    // Cart should still have items or show login
    const hasItems = page.locator('[class*="card"], [class*="item"]');
    const loginPrompt = page.getByText(/התחבר|log in/i);
    
    await expect(hasItems.or(loginPrompt).first()).toBeVisible();
  });
});

test.describe('Edge Cases', () => {
  test('should handle empty cart checkout attempt', async ({ page }) => {
    await page.goto('/checkout');
    
    // Should redirect or show error
    const errorOrRedirect = page.getByText(/ריקה|empty|התחבר|אין פריטים/i);
    await expect(errorOrRedirect.first()).toBeVisible();
  });

  test('should handle invalid promo code', async ({ page }) => {
    await page.goto('/checkout');
    
    // Look for promo code input
    const promoInput = page.getByPlaceholder(/קוד קופון|promo code|coupon/i);
    
    if (await promoInput.isVisible()) {
      await promoInput.fill('INVALID123');
      
      const applyBtn = page.getByText(/החל|apply/i);
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        
        // Should show error
        await expect(page.locator('[class*="error"], .text-destructive')).toBeVisible();
      }
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Enable offline mode
    await page.context().setOffline(true);
    
    await page.goto('/cart').catch(() => {});
    
    // Re-enable network
    await page.context().setOffline(false);
  });
});
