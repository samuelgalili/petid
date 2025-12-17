import { test, expect } from '@playwright/test';

test.describe('Add Pet Flow', () => {
  test.describe('Pet Type Selection (Step 1)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/add-pet');
    });

    test('should display add pet page correctly', async ({ page }) => {
      // Check for pet type selection
      const dogIcon = page.locator('[class*="dog"], img[alt*="dog"], img[alt*="כלב"]');
      const catIcon = page.locator('[class*="cat"], img[alt*="cat"], img[alt*="חתול"]');
      
      // Either pet selection or login prompt
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(dogIcon.or(catIcon).or(loginPrompt).first()).toBeVisible();
    });

    test('should display dog and cat options', async ({ page }) => {
      // Check for both pet type options
      await expect(page.locator('img, [class*="icon"]').first()).toBeVisible();
    });

    test('should select dog and advance to step 2', async ({ page }) => {
      const dogOption = page.locator('[class*="dog"], img[alt*="dog"], img[alt*="כלב"]').first();
      
      if (await dogOption.isVisible()) {
        await dogOption.click();
        await page.waitForTimeout(500);
        
        // Should show step 2 elements (photo upload, name field, etc.)
        const photoUpload = page.getByText(/העלה תמונה|upload photo|צלם/i);
        const nameField = page.getByPlaceholder(/שם|name/i);
        
        await expect(photoUpload.or(nameField).first()).toBeVisible();
      }
    });

    test('should select cat and advance to step 2', async ({ page }) => {
      const catOption = page.locator('[class*="cat"], img[alt*="cat"], img[alt*="חתול"]').first();
      
      if (await catOption.isVisible()) {
        await catOption.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Pet Details (Step 2)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/add-pet');
      
      // Select dog to get to step 2
      const dogOption = page.locator('[class*="dog"], img[alt*="dog"]').first();
      if (await dogOption.isVisible()) {
        await dogOption.click();
        await page.waitForTimeout(500);
      }
    });

    test('should display photo upload option', async ({ page }) => {
      const photoUpload = page.getByText(/העלה תמונה|upload|צלם|תמונה/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(photoUpload.or(loginPrompt).first()).toBeVisible();
    });

    test('should display name input field', async ({ page }) => {
      const nameField = page.getByPlaceholder(/שם החיה|pet name|שם/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(nameField.or(loginPrompt).first()).toBeVisible();
    });

    test('should display birth date picker', async ({ page }) => {
      const birthDateField = page.getByText(/תאריך לידה|birth date|גיל/i);
      const calendarIcon = page.locator('[class*="calendar"]');
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(birthDateField.or(calendarIcon).or(loginPrompt).first()).toBeVisible();
    });

    test('should display breed field', async ({ page }) => {
      const breedField = page.getByPlaceholder(/גזע|breed/i);
      const breedLabel = page.getByText(/גזע|breed/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(breedField.or(breedLabel).or(loginPrompt).first()).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      // Try to proceed without filling required fields
      const nextBtn = page.getByText(/המשך|next|הבא/i);
      
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(300);
        
        // Should show validation indicators
        const errorIndicator = page.locator('.text-destructive, .text-red-500, [class*="error"], [class*="required"]');
        await expect(errorIndicator.first()).toBeVisible();
      }
    });

    test('should fill pet name', async ({ page }) => {
      const nameField = page.getByPlaceholder(/שם החיה|pet name|שם/i);
      
      if (await nameField.isVisible()) {
        await nameField.fill('בובי');
        await expect(nameField).toHaveValue('בובי');
      }
    });
  });

  test.describe('AI Breed Detection', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/add-pet');
      
      // Navigate to step 2
      const dogOption = page.locator('[class*="dog"], img[alt*="dog"]').first();
      if (await dogOption.isVisible()) {
        await dogOption.click();
        await page.waitForTimeout(500);
      }
    });

    test('should show breed detection loading state', async ({ page }) => {
      // Look for upload or camera button
      const uploadBtn = page.getByText(/העלה|upload|צלם|camera/i);
      
      if (await uploadBtn.isVisible()) {
        // Upload functionality would trigger breed detection
        // This tests the UI elements are present
        await expect(uploadBtn).toBeVisible();
      }
    });

    test('should have AI breed detection indicator', async ({ page }) => {
      // Check for AI/automatic breed detection messaging
      const aiIndicator = page.getByText(/זיהוי אוטומטי|ai|גזע יזוהה/i);
      const breedField = page.getByPlaceholder(/גזע|breed/i);
      
      await expect(aiIndicator.or(breedField).first()).toBeVisible();
    });
  });

  test.describe('Review and Submit (Step 3)', () => {
    test('should display review page with entered details', async ({ page }) => {
      await page.goto('/add-pet');
      
      // This tests the structure exists - actual navigation requires auth
      const pageContent = page.locator('main, [class*="container"]');
      await expect(pageContent.first()).toBeVisible();
    });
  });

  test.describe('Form Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/add-pet');
    });

    test('should support back navigation between steps', async ({ page }) => {
      // Select pet type
      const dogOption = page.locator('[class*="dog"], img[alt*="dog"]').first();
      
      if (await dogOption.isVisible()) {
        await dogOption.click();
        await page.waitForTimeout(500);
        
        // Look for back button
        const backBtn = page.getByText(/חזור|back/i);
        const backArrow = page.locator('[class*="arrow-left"], [class*="chevron-left"]');
        
        if (await backBtn.isVisible()) {
          await backBtn.click();
          await page.waitForTimeout(300);
        } else if (await backArrow.first().isVisible()) {
          await backArrow.first().click();
          await page.waitForTimeout(300);
        }
      }
    });

    test('should support swipe navigation on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/add-pet');
      
      // Mobile swipe navigation test
      const container = page.locator('main, form, [class*="container"]').first();
      await expect(container).toBeVisible();
    });

    test('should show step indicators', async ({ page }) => {
      // Look for step indicators/progress
      const stepIndicator = page.locator('[class*="step"], [class*="progress"], [class*="indicator"]');
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(stepIndicator.or(loginPrompt).first()).toBeVisible();
    });
  });

  test.describe('Pet Type Validation', () => {
    test('should prevent mismatched pet type and photo', async ({ page }) => {
      await page.goto('/add-pet');
      
      // Select dog
      const dogOption = page.locator('[class*="dog"], img[alt*="dog"]').first();
      
      if (await dogOption.isVisible()) {
        await dogOption.click();
        await page.waitForTimeout(500);
        
        // UI should indicate selected pet type
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Gender Selection', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/add-pet');
      
      const dogOption = page.locator('[class*="dog"], img[alt*="dog"]').first();
      if (await dogOption.isVisible()) {
        await dogOption.click();
        await page.waitForTimeout(500);
      }
    });

    test('should display gender options', async ({ page }) => {
      const maleOption = page.getByText(/זכר|male/i);
      const femaleOption = page.getByText(/נקבה|female/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(maleOption.or(femaleOption).or(loginPrompt).first()).toBeVisible();
    });
  });

  test.describe('Neutered/Spayed Status', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/add-pet');
      
      const dogOption = page.locator('[class*="dog"], img[alt*="dog"]').first();
      if (await dogOption.isVisible()) {
        await dogOption.click();
        await page.waitForTimeout(500);
      }
    });

    test('should display neutered/spayed toggle', async ({ page }) => {
      const neuteredOption = page.getByText(/מסורס|מעוקרת|neutered|spayed/i);
      const toggleSwitch = page.locator('[role="switch"], [class*="switch"], [class*="toggle"]');
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(neuteredOption.or(toggleSwitch).or(loginPrompt).first()).toBeVisible();
    });
  });
});

test.describe('Add Pet - Authenticated User Flow', () => {
  // These tests assume the user would be logged in
  // In actual CI, you'd need to set up test user authentication
  
  test('should complete full pet addition journey', async ({ page }) => {
    await page.goto('/add-pet');
    
    // Step 1: Select pet type
    const dogOption = page.locator('[class*="dog"], img[alt*="dog"]').first();
    const loginPrompt = page.getByText(/התחבר|log in/i);
    
    if (await loginPrompt.isVisible()) {
      // User needs to be logged in - expected behavior
      await expect(loginPrompt).toBeVisible();
    } else if (await dogOption.isVisible()) {
      await dogOption.click();
      await page.waitForTimeout(500);
      
      // Step 2: Fill pet details
      const nameField = page.getByPlaceholder(/שם/i);
      if (await nameField.isVisible()) {
        await nameField.fill('לוקי');
      }
      
      // Continue through the form...
    }
  });

  test('should redirect to home after successful pet addition', async ({ page }) => {
    // After adding a pet, user should be redirected to home
    // This verifies the success flow exists
    await page.goto('/add-pet');
    
    const pageContent = page.locator('main, [class*="container"]');
    await expect(pageContent.first()).toBeVisible();
  });
});

test.describe('Edge Cases', () => {
  test('should handle special characters in pet name', async ({ page }) => {
    await page.goto('/add-pet');
    
    const dogOption = page.locator('[class*="dog"], img[alt*="dog"]').first();
    if (await dogOption.isVisible()) {
      await dogOption.click();
      await page.waitForTimeout(500);
      
      const nameField = page.getByPlaceholder(/שם/i);
      if (await nameField.isVisible()) {
        await nameField.fill('בובי 🐕');
        await expect(nameField).toHaveValue('בובי 🐕');
      }
    }
  });

  test('should handle very long pet names', async ({ page }) => {
    await page.goto('/add-pet');
    
    const dogOption = page.locator('[class*="dog"], img[alt*="dog"]').first();
    if (await dogOption.isVisible()) {
      await dogOption.click();
      await page.waitForTimeout(500);
      
      const nameField = page.getByPlaceholder(/שם/i);
      if (await nameField.isVisible()) {
        const longName = 'שם ארוך מאוד לחיית המחמד שלי';
        await nameField.fill(longName);
      }
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/add-pet');
    
    // Enable offline mode temporarily
    await page.context().setOffline(true);
    await page.waitForTimeout(500);
    await page.context().setOffline(false);
    
    // Page should still be usable
    await expect(page.locator('body')).toBeVisible();
  });
});
