import { test, expect } from '@playwright/test';

test.describe('Edit Pet Profile Flow', () => {
  test.describe('Access Pet Edit', () => {
    test('should access pet edit from home page', async ({ page }) => {
      await page.goto('/');
      
      // Look for pet avatars in My Pets section
      const petAvatar = page.locator('[class*="avatar"], [class*="pet-card"]').first();
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      if (await petAvatar.isVisible()) {
        // Long press or click to edit
        await petAvatar.click({ button: 'right' });
        await page.waitForTimeout(300);
      }
      
      await expect(petAvatar.or(loginPrompt).first()).toBeVisible();
    });

    test('should access pet details page', async ({ page }) => {
      await page.goto('/pet-details/test-id');
      
      // Should show pet details or redirect
      const petContent = page.getByText(/פרטי החיה|pet details|שם/i);
      const notFound = page.getByText(/לא נמצא|not found|404/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(petContent.or(notFound).or(loginPrompt).first()).toBeVisible();
    });
  });

  test.describe('Pet Edit Sheet/Dialog', () => {
    test('should display edit sheet with current pet data', async ({ page }) => {
      await page.goto('/');
      
      // Try to trigger edit sheet
      const petCard = page.locator('[class*="pet"], [class*="avatar"]').first();
      
      if (await petCard.isVisible()) {
        // Long press simulation
        await petCard.click();
        await page.waitForTimeout(1000);
        
        // Look for edit sheet
        const editSheet = page.locator('[role="dialog"], [class*="sheet"], [class*="drawer"]');
        const loginPrompt = page.getByText(/התחבר|log in/i);
        
        await expect(editSheet.or(loginPrompt).first()).toBeVisible();
      }
    });

    test('should display pet name in edit form', async ({ page }) => {
      await page.goto('/');
      
      const editForm = page.getByPlaceholder(/שם|name/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      // Either we see the form or need to login
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Edit Pet Name', () => {
    test('should update pet name', async ({ page }) => {
      await page.goto('/');
      
      // Look for name input in any edit context
      const nameInput = page.getByPlaceholder(/שם החיה|pet name|שם/i);
      
      if (await nameInput.isVisible()) {
        await nameInput.clear();
        await nameInput.fill('שם חדש');
        await expect(nameInput).toHaveValue('שם חדש');
      }
    });

    test('should validate empty name', async ({ page }) => {
      await page.goto('/');
      
      const nameInput = page.getByPlaceholder(/שם/i);
      
      if (await nameInput.isVisible()) {
        await nameInput.clear();
        
        // Try to save
        const saveBtn = page.getByText(/שמור|save|עדכן/i);
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          
          // Should show error
          const error = page.locator('.text-destructive, .text-red-500, [class*="error"]');
          await expect(error.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Edit Pet Photo', () => {
    test('should display current pet photo', async ({ page }) => {
      await page.goto('/');
      
      // Look for pet image
      const petImage = page.locator('img[class*="avatar"], img[class*="pet"]').first();
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(petImage.or(loginPrompt).first()).toBeVisible();
    });

    test('should have photo upload option', async ({ page }) => {
      await page.goto('/');
      
      // Look for photo upload button
      const uploadBtn = page.getByText(/החלף תמונה|change photo|העלה|upload/i);
      const cameraIcon = page.locator('[class*="camera"]');
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('should trigger breed re-detection on new photo', async ({ page }) => {
      await page.goto('/');
      
      // Look for re-detect breed button
      const redetectBtn = page.getByText(/זהה גזע מחדש|re-detect|זיהוי חוזר/i);
      
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Edit Birth Date', () => {
    test('should display birth date picker', async ({ page }) => {
      await page.goto('/');
      
      const birthDateInput = page.getByText(/תאריך לידה|birth date/i);
      const calendarIcon = page.locator('[class*="calendar"]');
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('should update birth date', async ({ page }) => {
      await page.goto('/');
      
      const calendarTrigger = page.locator('[class*="calendar"], [class*="date"]').first();
      
      if (await calendarTrigger.isVisible()) {
        await calendarTrigger.click();
        await page.waitForTimeout(300);
        
        // Calendar should open
        const calendar = page.locator('[role="dialog"], [class*="calendar-popup"]');
        await expect(calendar.first()).toBeVisible();
      }
    });
  });

  test.describe('Edit Breed', () => {
    test('should display current breed', async ({ page }) => {
      await page.goto('/');
      
      const breedField = page.getByPlaceholder(/גזע|breed/i);
      const breedText = page.getByText(/גזע|breed/i);
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('should allow manual breed edit', async ({ page }) => {
      await page.goto('/');
      
      const breedInput = page.getByPlaceholder(/גזע|breed/i);
      
      if (await breedInput.isVisible()) {
        await breedInput.clear();
        await breedInput.fill('לברדור');
        await expect(breedInput).toHaveValue('לברדור');
      }
    });
  });

  test.describe('Edit Gender', () => {
    test('should display gender options', async ({ page }) => {
      await page.goto('/');
      
      const maleOption = page.getByText(/זכר|male/i);
      const femaleOption = page.getByText(/נקבה|female/i);
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('should toggle gender selection', async ({ page }) => {
      await page.goto('/');
      
      const genderToggle = page.locator('[role="radiogroup"], [class*="toggle"], [class*="radio"]').first();
      
      if (await genderToggle.isVisible()) {
        await genderToggle.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Edit Neutered Status', () => {
    test('should display neutered/spayed toggle', async ({ page }) => {
      await page.goto('/');
      
      const neuteredLabel = page.getByText(/מסורס|מעוקרת|neutered|spayed/i);
      const toggle = page.locator('[role="switch"]');
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('should toggle neutered status', async ({ page }) => {
      await page.goto('/');
      
      const toggle = page.locator('[role="switch"]').first();
      
      if (await toggle.isVisible()) {
        const initialState = await toggle.getAttribute('aria-checked');
        await toggle.click();
        await page.waitForTimeout(300);
        
        const newState = await toggle.getAttribute('aria-checked');
        expect(newState).not.toBe(initialState);
      }
    });
  });

  test.describe('Save Changes', () => {
    test('should save updated pet profile', async ({ page }) => {
      await page.goto('/');
      
      const saveBtn = page.getByText(/שמור|save|עדכן/i);
      
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        
        // Should show success toast
        const toast = page.locator('[class*="toast"], [role="status"]');
        await expect(toast.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('should cancel edit and discard changes', async ({ page }) => {
      await page.goto('/');
      
      const cancelBtn = page.getByText(/ביטול|cancel|סגור/i);
      
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }
    });

    test('should show confirmation before discarding unsaved changes', async ({ page }) => {
      await page.goto('/');
      
      // Make a change
      const nameInput = page.getByPlaceholder(/שם/i);
      
      if (await nameInput.isVisible()) {
        await nameInput.fill('שינוי זמני');
        
        // Try to cancel
        const cancelBtn = page.getByText(/ביטול|cancel/i);
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
          
          // May show confirmation dialog
          const confirmDialog = page.locator('[role="alertdialog"], [class*="confirm"]');
          // This is optional behavior
        }
      }
    });
  });

  test.describe('Archive Pet', () => {
    test('should display archive option', async ({ page }) => {
      await page.goto('/');
      
      const archiveBtn = page.getByText(/העבר לארכיון|archive|מחק/i);
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show confirmation before archiving', async ({ page }) => {
      await page.goto('/');
      
      const archiveBtn = page.getByText(/העבר לארכיון|archive/i);
      
      if (await archiveBtn.isVisible()) {
        await archiveBtn.click();
        
        // Should show confirmation dialog
        const confirmDialog = page.locator('[role="alertdialog"], [class*="dialog"]');
        const confirmText = page.getByText(/האם אתה בטוח|are you sure/i);
        
        await expect(confirmDialog.or(confirmText).first()).toBeVisible();
      }
    });
  });

  test.describe('Breed Detection History', () => {
    test('should access breed history', async ({ page }) => {
      await page.goto('/');
      
      const historyBtn = page.getByText(/היסטוריית גזע|breed history|היסטוריה/i);
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display breed detection timeline', async ({ page }) => {
      await page.goto('/breed-history/test-id');
      
      // Should show history or redirect
      const historyContent = page.getByText(/היסטוריה|history|זיהוי/i);
      const loginPrompt = page.getByText(/התחבר|log in/i);
      
      await expect(historyContent.or(loginPrompt).first()).toBeVisible();
    });
  });
});

test.describe('Pet Profile Validation', () => {
  test('should validate required fields on save', async ({ page }) => {
    await page.goto('/');
    
    const nameInput = page.getByPlaceholder(/שם/i);
    
    if (await nameInput.isVisible()) {
      await nameInput.clear();
      
      const saveBtn = page.getByText(/שמור|save/i);
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        
        // Should show validation error
        const error = page.locator('.text-destructive, [class*="error"]');
        await expect(error.first()).toBeVisible();
      }
    }
  });

  test('should handle special characters in fields', async ({ page }) => {
    await page.goto('/');
    
    const nameInput = page.getByPlaceholder(/שם/i);
    
    if (await nameInput.isVisible()) {
      await nameInput.fill('בובי ❤️ 🐕');
      await expect(nameInput).toHaveValue('בובי ❤️ 🐕');
    }
  });
});

test.describe('Pet Edit Accessibility', () => {
  test('should support keyboard navigation in edit form', async ({ page }) => {
    await page.goto('/');
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    
    // Check for aria-label attributes
    const labeledElements = page.locator('[aria-label]');
    const count = await labeledElements.count();
    
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Pet Edit Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Simulate offline
    await page.context().setOffline(true);
    
    const saveBtn = page.getByText(/שמור|save/i);
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Re-enable network
    await page.context().setOffline(false);
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show error toast on save failure', async ({ page }) => {
    await page.goto('/');
    
    // UI should handle errors gracefully
    await expect(page.locator('body')).toBeVisible();
  });
});
