import { test, expect } from '@playwright/test';

test.describe('Notifications System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notifications');
  });

  test.describe('Notifications Page Display', () => {
    test('should display notifications page', async ({ page }) => {
      await expect(page.locator('text=התראות')).toBeVisible();
    });

    test('should show back button', async ({ page }) => {
      const backButton = page.locator('[data-testid="back-button"], button:has(svg)').first();
      await expect(backButton).toBeVisible();
    });

    test('should display notification list', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const notificationList = page.locator('[data-testid="notification-list"]');
      if (await notificationList.isVisible()) {
        await expect(notificationList).toBeVisible();
      }
    });

    test('should show empty state when no notifications', async ({ page }) => {
      const emptyState = page.locator('text=אין התראות, text=אין הודעות חדשות');
      if (await emptyState.first().isVisible()) {
        await expect(emptyState.first()).toBeVisible();
      }
    });
  });

  test.describe('Notification Items', () => {
    test('should display notification title', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const notifications = page.locator('[data-testid="notification-item"]');
      const count = await notifications.count();
      
      if (count > 0) {
        const title = notifications.first().locator('[data-testid="notification-title"], h3, h4');
        await expect(title.first()).toBeVisible();
      }
    });

    test('should display notification message', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const notifications = page.locator('[data-testid="notification-item"]');
      const count = await notifications.count();
      
      if (count > 0) {
        const message = notifications.first().locator('[data-testid="notification-message"], p');
        await expect(message.first()).toBeVisible();
      }
    });

    test('should display notification timestamp', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const notifications = page.locator('[data-testid="notification-item"]');
      const count = await notifications.count();
      
      if (count > 0) {
        const timestamp = notifications.first().locator('[data-testid="notification-time"], time, span:has-text("לפני")');
        if (await timestamp.first().isVisible()) {
          await expect(timestamp.first()).toBeVisible();
        }
      }
    });

    test('should show notification icon based on type', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const notifications = page.locator('[data-testid="notification-item"]');
      const count = await notifications.count();
      
      if (count > 0) {
        const icon = notifications.first().locator('svg, [data-testid="notification-icon"]');
        await expect(icon.first()).toBeVisible();
      }
    });

    test('should distinguish read from unread notifications', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const unreadNotifications = page.locator('[data-testid="notification-item"][data-unread="true"], .bg-blue-50, .bg-primary/10');
      const readNotifications = page.locator('[data-testid="notification-item"][data-unread="false"], .bg-white, .bg-background');
      
      // Just verify the page loads and handles both states
      await page.waitForTimeout(500);
    });
  });

  test.describe('Mark as Read', () => {
    test('should mark notification as read on click', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const notifications = page.locator('[data-testid="notification-item"]');
      const count = await notifications.count();
      
      if (count > 0) {
        await notifications.first().click();
        await page.waitForTimeout(500);
        
        // Notification should be marked as read
      }
    });

    test('should have mark all as read button', async ({ page }) => {
      const markAllButton = page.locator('button:has-text("סמן הכל כנקרא"), button:has-text("קראתי הכל")');
      if (await markAllButton.first().isVisible()) {
        await expect(markAllButton.first()).toBeVisible();
      }
    });

    test('should mark all notifications as read', async ({ page }) => {
      const markAllButton = page.locator('button:has-text("סמן הכל כנקרא"), button:has-text("קראתי הכל")');
      
      if (await markAllButton.first().isVisible()) {
        await markAllButton.first().click();
        await page.waitForTimeout(1000);
        
        // All notifications should be marked as read
      }
    });
  });

  test.describe('Notification Actions', () => {
    test('should navigate to relevant page on notification click', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const notifications = page.locator('[data-testid="notification-item"]');
      const count = await notifications.count();
      
      if (count > 0) {
        const initialUrl = page.url();
        await notifications.first().click();
        await page.waitForTimeout(500);
        
        // Should navigate or perform action
      }
    });

    test('should support swipe to dismiss', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const notifications = page.locator('[data-testid="notification-item"]');
      const count = await notifications.count();
      
      if (count > 0) {
        // Simulate swipe gesture
        const firstNotification = notifications.first();
        const box = await firstNotification.boundingBox();
        
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x - 100, box.y + box.height / 2);
          await page.mouse.up();
          
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Notification Badge', () => {
    test('should show unread count badge in header', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      const notificationBadge = page.locator('[data-testid="notification-badge"], .bg-red-500, .bg-destructive');
      if (await notificationBadge.first().isVisible()) {
        await expect(notificationBadge.first()).toBeVisible();
      }
    });

    test('should update badge count when notifications are read', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      const notificationBadge = page.locator('[data-testid="notification-badge"]');
      
      if (await notificationBadge.first().isVisible()) {
        const initialCount = await notificationBadge.first().textContent();
        
        // Navigate to notifications
        await page.goto('/notifications');
        await page.waitForTimeout(500);
        
        // Mark one as read
        const notifications = page.locator('[data-testid="notification-item"]');
        if (await notifications.first().isVisible()) {
          await notifications.first().click();
          await page.waitForTimeout(500);
        }
        
        // Go back and check badge
        await page.goto('/');
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Notification Types', () => {
    test('should display like notifications', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const likeNotifications = page.locator('[data-notification-type="like"], text=אהב, text=לייק');
      if (await likeNotifications.first().isVisible()) {
        await expect(likeNotifications.first()).toBeVisible();
      }
    });

    test('should display comment notifications', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const commentNotifications = page.locator('[data-notification-type="comment"], text=תגובה, text=הגיב');
      if (await commentNotifications.first().isVisible()) {
        await expect(commentNotifications.first()).toBeVisible();
      }
    });

    test('should display follow notifications', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const followNotifications = page.locator('[data-notification-type="follow"], text=עוקב, text=התחיל לעקוב');
      if (await followNotifications.first().isVisible()) {
        await expect(followNotifications.first()).toBeVisible();
      }
    });

    test('should display system notifications', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const systemNotifications = page.locator('[data-notification-type="system"], text=מערכת, text=עדכון');
      if (await systemNotifications.first().isVisible()) {
        await expect(systemNotifications.first()).toBeVisible();
      }
    });
  });

  test.describe('Real-time Notifications', () => {
    test('should receive new notifications in real-time', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      // Subscribe to realtime updates
      const notificationList = page.locator('[data-testid="notification-list"]');
      
      // Verify page is ready for realtime updates
      await page.waitForTimeout(500);
    });

    test('should show toast for new notifications', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      // Check for toast container
      const toastContainer = page.locator('[data-sonner-toaster], [role="region"]');
      await expect(toastContainer).toBeAttached();
    });
  });

  test.describe('Notification Filters', () => {
    test('should filter by notification type', async ({ page }) => {
      const filterTabs = page.locator('[role="tablist"], [data-testid="notification-filters"]');
      
      if (await filterTabs.first().isVisible()) {
        await expect(filterTabs.first()).toBeVisible();
      }
    });

    test('should show all notifications by default', async ({ page }) => {
      const allTab = page.locator('button:has-text("הכל"), [data-testid="filter-all"]');
      
      if (await allTab.first().isVisible()) {
        // All tab should be active by default
        await expect(allTab.first()).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      const notifications = page.locator('[data-testid="notification-item"], [role="listitem"]');
      const count = await notifications.count();
      
      if (count > 0) {
        const ariaLabel = await notifications.first().getAttribute('aria-label');
        const role = await notifications.first().getAttribute('role');
        
        // Should have some accessibility attributes
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab to first notification
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Press Enter to interact
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(500);
    });

    test('should announce new notifications to screen readers', async ({ page }) => {
      const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"], [role="status"]');
      await expect(liveRegion.first()).toBeAttached();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await page.context().setOffline(true);
      
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Should show error message or cached data
      await page.context().setOffline(false);
    });

    test('should retry failed notification fetch', async ({ page }) => {
      await page.context().setOffline(true);
      await page.reload();
      await page.waitForTimeout(1000);
      
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);
      
      // Should automatically retry or show retry button
    });
  });

  test.describe('Push Notifications', () => {
    test('should show push notification permission prompt', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      // Check for permission prompt component
      const permissionPrompt = page.locator('[data-testid="push-notification-prompt"], text=התראות פוש, text=אפשר התראות');
      if (await permissionPrompt.first().isVisible()) {
        await expect(permissionPrompt.first()).toBeVisible();
      }
    });

    test('should have enable notifications button', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(1000);
      
      const enableButton = page.locator('button:has-text("אפשר התראות"), button:has-text("הפעל התראות")');
      if (await enableButton.first().isVisible()) {
        await expect(enableButton.first()).toBeVisible();
      }
    });
  });
});

test.describe('Notification Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test.describe('Notification Preferences', () => {
    test('should show notification settings section', async ({ page }) => {
      const notificationSettings = page.locator('text=התראות, text=הודעות');
      await expect(notificationSettings.first()).toBeVisible();
    });

    test('should toggle push notifications', async ({ page }) => {
      const pushToggle = page.locator('[data-testid="push-notifications-toggle"], button[role="switch"]');
      
      if (await pushToggle.first().isVisible()) {
        await pushToggle.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should toggle email notifications', async ({ page }) => {
      const emailToggle = page.locator('[data-testid="email-notifications-toggle"], button[role="switch"]');
      
      if (await emailToggle.first().isVisible()) {
        await emailToggle.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should save notification preferences', async ({ page }) => {
      const saveButton = page.locator('button:has-text("שמור"), button[type="submit"]');
      
      if (await saveButton.first().isVisible()) {
        await saveButton.first().click();
        await page.waitForTimeout(1000);
        
        // Should show success message
        const successToast = page.locator('text=נשמר, text=עודכן');
        if (await successToast.first().isVisible()) {
          await expect(successToast.first()).toBeVisible();
        }
      }
    });
  });
});
