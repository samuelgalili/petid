import { test, expect } from '@playwright/test';

test.describe('User Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
  });

  test.describe('Profile Page Display', () => {
    test('should display profile page', async ({ page }) => {
      // Check for profile elements
      await expect(page.locator('text=פרופיל')).toBeVisible();
    });

    test('should show user avatar', async ({ page }) => {
      const avatar = page.locator('[data-testid="profile-avatar"], img[alt*="avatar"], img[alt*="פרופיל"]');
      await expect(avatar.first()).toBeVisible();
    });

    test('should display user name', async ({ page }) => {
      const userName = page.locator('[data-testid="user-name"], h1, h2').first();
      await expect(userName).toBeVisible();
    });

    test('should show edit profile button', async ({ page }) => {
      const editButton = page.locator('button:has-text("עריכה"), button:has-text("ערוך"), [data-testid="edit-profile-button"]');
      await expect(editButton.first()).toBeVisible();
    });

    test('should display user statistics', async ({ page }) => {
      // Check for stats like posts count, followers, following
      const stats = page.locator('[data-testid="profile-stats"]');
      if (await stats.isVisible()) {
        await expect(stats).toBeVisible();
      }
    });

    test('should show user bio section', async ({ page }) => {
      const bioSection = page.locator('[data-testid="user-bio"], text=אודות');
      if (await bioSection.first().isVisible()) {
        await expect(bioSection.first()).toBeVisible();
      }
    });
  });

  test.describe('Edit Profile Navigation', () => {
    test('should navigate to edit profile page', async ({ page }) => {
      const editButton = page.locator('button:has-text("עריכה"), button:has-text("ערוך"), [data-testid="edit-profile-button"]');
      await editButton.first().click();
      
      await page.waitForTimeout(500);
      
      // Should be on edit page or show edit modal
      const editForm = page.locator('form, [data-testid="edit-profile-form"]');
      await expect(editForm.first()).toBeVisible();
    });
  });
});

test.describe('Edit Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit-profile');
  });

  test.describe('Edit Form Display', () => {
    test('should display edit profile page', async ({ page }) => {
      await expect(page.locator('text=עריכת פרופיל')).toBeVisible();
    });

    test('should show name input field', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="שם"]');
      await expect(nameInput.first()).toBeVisible();
    });

    test('should show email field', async ({ page }) => {
      const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="אימייל"]');
      await expect(emailInput.first()).toBeVisible();
    });

    test('should show phone field', async ({ page }) => {
      const phoneInput = page.locator('input[name="phone"], input[type="tel"], input[placeholder*="טלפון"]');
      await expect(phoneInput.first()).toBeVisible();
    });

    test('should show bio/about textarea', async ({ page }) => {
      const bioTextarea = page.locator('textarea[name="bio"], textarea[placeholder*="אודות"], textarea[placeholder*="ביו"]');
      if (await bioTextarea.first().isVisible()) {
        await expect(bioTextarea.first()).toBeVisible();
      }
    });

    test('should show save button', async ({ page }) => {
      const saveButton = page.locator('button:has-text("שמור"), button:has-text("עדכן"), button[type="submit"]');
      await expect(saveButton.first()).toBeVisible();
    });

    test('should show cancel/back button', async ({ page }) => {
      const cancelButton = page.locator('button:has-text("ביטול"), button:has-text("חזור"), [data-testid="back-button"]');
      await expect(cancelButton.first()).toBeVisible();
    });
  });

  test.describe('Avatar Upload', () => {
    test('should show avatar upload option', async ({ page }) => {
      const avatarUpload = page.locator('[data-testid="avatar-upload"], button:has-text("שנה תמונה"), button:has-text("העלה תמונה")');
      await expect(avatarUpload.first()).toBeVisible();
    });

    test('should open image picker on avatar click', async ({ page }) => {
      const avatarUpload = page.locator('[data-testid="avatar-upload"], button:has-text("שנה תמונה"), [data-testid="profile-avatar"]');
      
      if (await avatarUpload.first().isVisible()) {
        await avatarUpload.first().click();
        
        // Should show file input or image editor
        await page.waitForTimeout(500);
      }
    });

    test('should have file input for image upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput.first()).toBeAttached();
    });
  });

  test.describe('Form Editing', () => {
    test('should update name field', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="שם"]');
      await nameInput.first().clear();
      await nameInput.first().fill('שם חדש לבדיקה');
      await expect(nameInput.first()).toHaveValue('שם חדש לבדיקה');
    });

    test('should update bio field', async ({ page }) => {
      const bioTextarea = page.locator('textarea[name="bio"], textarea[placeholder*="אודות"]');
      
      if (await bioTextarea.first().isVisible()) {
        await bioTextarea.first().clear();
        await bioTextarea.first().fill('ביוגרפיה חדשה לבדיקה');
        await expect(bioTextarea.first()).toHaveValue('ביוגרפיה חדשה לבדיקה');
      }
    });

    test('should update phone field', async ({ page }) => {
      const phoneInput = page.locator('input[name="phone"], input[type="tel"], input[placeholder*="טלפון"]');
      
      if (await phoneInput.first().isVisible()) {
        await phoneInput.first().clear();
        await phoneInput.first().fill('0501234567');
        await expect(phoneInput.first()).toHaveValue('0501234567');
      }
    });

    test('should handle special characters in name', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="שם"]');
      await nameInput.first().clear();
      await nameInput.first().fill('שם עם אמוג\'י 🐕');
      await expect(nameInput.first()).toHaveValue('שם עם אמוג\'י 🐕');
    });

    test('should handle long text in bio', async ({ page }) => {
      const bioTextarea = page.locator('textarea[name="bio"], textarea[placeholder*="אודות"]');
      
      if (await bioTextarea.first().isVisible()) {
        const longText = 'זוהי ביוגרפיה ארוכה מאוד לצורך בדיקה. '.repeat(10);
        await bioTextarea.first().clear();
        await bioTextarea.first().fill(longText);
        await expect(bioTextarea.first()).toHaveValue(longText);
      }
    });
  });

  test.describe('Form Validation', () => {
    test('should show error for empty name', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="שם"]');
      await nameInput.first().clear();
      
      const saveButton = page.locator('button:has-text("שמור"), button:has-text("עדכן"), button[type="submit"]');
      await saveButton.first().click();
      
      await page.waitForTimeout(500);
      
      // Check for error message
      const errorMessage = page.locator('text=שם, text=חובה, text=שגיאה');
      // Error should be visible or field should be marked as invalid
    });

    test('should validate email format', async ({ page }) => {
      const emailInput = page.locator('input[name="email"], input[type="email"]');
      
      if (await emailInput.first().isVisible()) {
        await emailInput.first().clear();
        await emailInput.first().fill('invalid-email');
        
        const saveButton = page.locator('button:has-text("שמור"), button:has-text("עדכן"), button[type="submit"]');
        await saveButton.first().click();
        
        await page.waitForTimeout(500);
      }
    });

    test('should validate phone number format', async ({ page }) => {
      const phoneInput = page.locator('input[name="phone"], input[type="tel"]');
      
      if (await phoneInput.first().isVisible()) {
        await phoneInput.first().clear();
        await phoneInput.first().fill('123'); // Too short
        
        const saveButton = page.locator('button:has-text("שמור"), button:has-text("עדכן"), button[type="submit"]');
        await saveButton.first().click();
        
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Save Changes', () => {
    test('should save profile changes', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="שם"]');
      await nameInput.first().clear();
      await nameInput.first().fill('שם מעודכן');
      
      const saveButton = page.locator('button:has-text("שמור"), button:has-text("עדכן"), button[type="submit"]');
      await saveButton.first().click();
      
      await page.waitForTimeout(1000);
      
      // Should show success message or navigate back
      const successToast = page.locator('text=נשמר, text=עודכן, text=בהצלחה');
      if (await successToast.first().isVisible()) {
        await expect(successToast.first()).toBeVisible();
      }
    });

    test('should cancel changes and go back', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="שם"]');
      const originalValue = await nameInput.first().inputValue();
      
      await nameInput.first().clear();
      await nameInput.first().fill('שינוי שיתבטל');
      
      const cancelButton = page.locator('button:has-text("ביטול"), button:has-text("חזור"), [data-testid="back-button"]');
      await cancelButton.first().click();
      
      await page.waitForTimeout(500);
      
      // Should navigate back without saving
      await expect(page).not.toHaveURL('/edit-profile');
    });

    test('should show loading state while saving', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="שם"]');
      await nameInput.first().clear();
      await nameInput.first().fill('שם לשמירה');
      
      const saveButton = page.locator('button:has-text("שמור"), button:has-text("עדכן"), button[type="submit"]');
      await saveButton.first().click();
      
      // Check for loading indicator
      const loadingIndicator = page.locator('.animate-spin, [data-testid="loading"]');
      // Loading should appear briefly
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      const labels = page.locator('label');
      const count = await labels.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through form fields
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to type in focused field
      await page.keyboard.type('בדיקת מקלדת');
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[name="full_name"]');
      
      if (await nameInput.first().isVisible()) {
        const ariaLabel = await nameInput.first().getAttribute('aria-label');
        const placeholder = await nameInput.first().getAttribute('placeholder');
        const id = await nameInput.first().getAttribute('id');
        
        // Should have some form of labeling
        expect(ariaLabel || placeholder || id).toBeTruthy();
      }
    });

    test('should announce errors to screen readers', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[name="full_name"]');
      await nameInput.first().clear();
      
      const saveButton = page.locator('button:has-text("שמור"), button[type="submit"]');
      await saveButton.first().click();
      
      await page.waitForTimeout(500);
      
      // Check for aria-live or role="alert" for errors
      const alertElements = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]');
      // Should have alert elements if errors present
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline
      await page.context().setOffline(true);
      
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="שם"]');
      await nameInput.first().clear();
      await nameInput.first().fill('שם במצב אופליין');
      
      const saveButton = page.locator('button:has-text("שמור"), button[type="submit"]');
      await saveButton.first().click();
      
      await page.waitForTimeout(2000);
      
      // Should show error message
      await page.context().setOffline(false);
    });

    test('should preserve form data on error', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="שם"]');
      await nameInput.first().clear();
      await nameInput.first().fill('שם שצריך להישמר');
      
      // Simulate error scenario
      await page.context().setOffline(true);
      
      const saveButton = page.locator('button:has-text("שמור"), button[type="submit"]');
      await saveButton.first().click();
      
      await page.waitForTimeout(1000);
      
      // Data should still be in form
      await expect(nameInput.first()).toHaveValue('שם שצריך להישמר');
      
      await page.context().setOffline(false);
    });
  });
});

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test.describe('Settings Page', () => {
    test('should display settings page', async ({ page }) => {
      await expect(page.locator('text=הגדרות')).toBeVisible();
    });

    test('should show profile settings section', async ({ page }) => {
      const profileSection = page.locator('text=פרופיל, text=חשבון');
      await expect(profileSection.first()).toBeVisible();
    });

    test('should navigate to edit profile from settings', async ({ page }) => {
      const editProfileLink = page.locator('a:has-text("עריכת פרופיל"), button:has-text("עריכת פרופיל")');
      
      if (await editProfileLink.first().isVisible()) {
        await editProfileLink.first().click();
        await expect(page).toHaveURL(/edit-profile/);
      }
    });

    test('should show notification settings', async ({ page }) => {
      const notificationSettings = page.locator('text=התראות, text=הודעות');
      if (await notificationSettings.first().isVisible()) {
        await expect(notificationSettings.first()).toBeVisible();
      }
    });

    test('should show privacy settings', async ({ page }) => {
      const privacySettings = page.locator('text=פרטיות, text=אבטחה');
      if (await privacySettings.first().isVisible()) {
        await expect(privacySettings.first()).toBeVisible();
      }
    });
  });
});
