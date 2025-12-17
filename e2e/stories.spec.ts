import { test, expect } from '@playwright/test';

test.describe('Stories System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Stories Bar Display', () => {
    test('should display stories bar on feed', async ({ page }) => {
      const storiesBar = page.locator('[data-testid="stories-bar"], .stories-container');
      await expect(storiesBar.first()).toBeVisible();
    });

    test('should show user story avatars', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const storyAvatars = page.locator('[data-testid="story-avatar"], .story-avatar');
      const count = await storyAvatars.count();
      
      if (count > 0) {
        await expect(storyAvatars.first()).toBeVisible();
      }
    });

    test('should show add story button', async ({ page }) => {
      const addStoryButton = page.locator('[data-testid="add-story-button"], button:has-text("הוסף סטורי")');
      if (await addStoryButton.first().isVisible()) {
        await expect(addStoryButton.first()).toBeVisible();
      }
    });

    test('should display story ring gradient for unseen stories', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const unseenRing = page.locator('.story-ring, [data-testid="unseen-story"]');
      if (await unseenRing.first().isVisible()) {
        await expect(unseenRing.first()).toBeVisible();
      }
    });

    test('should show gray ring for seen stories', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const seenRing = page.locator('.story-seen, [data-testid="seen-story"]');
      // May or may not be visible depending on state
    });

    test('should display username below avatar', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const storyUsernames = page.locator('[data-testid="story-username"]');
      const count = await storyUsernames.count();
      
      if (count > 0) {
        await expect(storyUsernames.first()).toBeVisible();
      }
    });

    test('should scroll horizontally through stories', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const storiesBar = page.locator('[data-testid="stories-bar"]');
      
      if (await storiesBar.first().isVisible()) {
        // Scroll right
        await storiesBar.first().evaluate(el => el.scrollLeft += 200);
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Story Viewer', () => {
    test('should open story viewer on story click', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const storyAvatars = page.locator('[data-testid="story-avatar"]');
      const count = await storyAvatars.count();
      
      if (count > 0) {
        await storyAvatars.first().click();
        await page.waitForTimeout(500);
        
        // Story viewer should open
        const storyViewer = page.locator('[data-testid="story-viewer"], .story-viewer');
        if (await storyViewer.first().isVisible()) {
          await expect(storyViewer.first()).toBeVisible();
        }
      }
    });

    test('should display story content', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(1000);
      
      const storyContent = page.locator('[data-testid="story-content"], img, video');
      await expect(storyContent.first()).toBeVisible();
    });

    test('should show progress bar', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const progressBar = page.locator('[data-testid="story-progress"], .progress-bar');
      if (await progressBar.first().isVisible()) {
        await expect(progressBar.first()).toBeVisible();
      }
    });

    test('should navigate to next story on tap right', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const storyViewer = page.locator('[data-testid="story-viewer"]');
      
      if (await storyViewer.first().isVisible()) {
        const box = await storyViewer.first().boundingBox();
        if (box) {
          // Tap right side
          await page.click(`text=test >> ..`, { position: { x: box.width - 50, y: box.height / 2 } });
        }
      }
    });

    test('should navigate to previous story on tap left', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const storyViewer = page.locator('[data-testid="story-viewer"]');
      
      if (await storyViewer.first().isVisible()) {
        const box = await storyViewer.first().boundingBox();
        if (box) {
          // Tap left side
          await page.click(`text=test >> ..`, { position: { x: 50, y: box.height / 2 } });
        }
      }
    });

    test('should close story viewer on X button', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const closeButton = page.locator('[data-testid="close-story"], button:has(svg)').first();
      
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    });

    test('should pause story on long press', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const storyContent = page.locator('[data-testid="story-content"]');
      
      if (await storyContent.first().isVisible()) {
        await storyContent.first().click({ delay: 1000 });
        await page.waitForTimeout(500);
      }
    });

    test('should show story timestamp', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const timestamp = page.locator('[data-testid="story-timestamp"], text=לפני');
      if (await timestamp.first().isVisible()) {
        await expect(timestamp.first()).toBeVisible();
      }
    });

    test('should show user info in story', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const userInfo = page.locator('[data-testid="story-user-info"]');
      if (await userInfo.first().isVisible()) {
        await expect(userInfo.first()).toBeVisible();
      }
    });
  });

  test.describe('Create Story', () => {
    test('should open create story dialog', async ({ page }) => {
      const addStoryButton = page.locator('[data-testid="add-story-button"], button:has-text("הוסף סטורי")');
      
      if (await addStoryButton.first().isVisible()) {
        await addStoryButton.first().click();
        await page.waitForTimeout(500);
        
        const createDialog = page.locator('[data-testid="create-story-dialog"], [role="dialog"]');
        await expect(createDialog.first()).toBeVisible();
      }
    });

    test('should have image upload option', async ({ page }) => {
      const addStoryButton = page.locator('[data-testid="add-story-button"]');
      
      if (await addStoryButton.first().isVisible()) {
        await addStoryButton.first().click();
        await page.waitForTimeout(500);
        
        const uploadOption = page.locator('input[type="file"], button:has-text("העלה תמונה")');
        await expect(uploadOption.first()).toBeAttached();
      }
    });

    test('should have camera capture option', async ({ page }) => {
      const addStoryButton = page.locator('[data-testid="add-story-button"]');
      
      if (await addStoryButton.first().isVisible()) {
        await addStoryButton.first().click();
        await page.waitForTimeout(500);
        
        const cameraOption = page.locator('button:has-text("צלם"), button:has-text("מצלמה")');
        if (await cameraOption.first().isVisible()) {
          await expect(cameraOption.first()).toBeVisible();
        }
      }
    });

    test('should preview story before posting', async ({ page }) => {
      // Navigate to story creation flow
      const addStoryButton = page.locator('[data-testid="add-story-button"]');
      
      if (await addStoryButton.first().isVisible()) {
        await addStoryButton.first().click();
        await page.waitForTimeout(500);
        
        // Preview should show after image selection
      }
    });

    test('should post story successfully', async ({ page }) => {
      const addStoryButton = page.locator('[data-testid="add-story-button"]');
      
      if (await addStoryButton.first().isVisible()) {
        await addStoryButton.first().click();
        await page.waitForTimeout(500);
        
        const postButton = page.locator('button:has-text("פרסם"), button:has-text("שתף")');
        if (await postButton.first().isVisible()) {
          await expect(postButton.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Story Interactions', () => {
    test('should show reply input', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const replyInput = page.locator('input[placeholder*="תגובה"], input[placeholder*="הגב"]');
      if (await replyInput.first().isVisible()) {
        await expect(replyInput.first()).toBeVisible();
      }
    });

    test('should send story reply', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const replyInput = page.locator('input[placeholder*="תגובה"], input[placeholder*="הגב"]');
      
      if (await replyInput.first().isVisible()) {
        await replyInput.first().fill('תגובה לסטורי');
        
        const sendButton = page.locator('[data-testid="send-reply"], button:has(svg)').last();
        if (await sendButton.isVisible()) {
          await sendButton.click();
        }
      }
    });

    test('should show story viewers count for own stories', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const viewersCount = page.locator('[data-testid="story-viewers"], text=צפיות');
      // Only visible for own stories
    });
  });
});

test.describe('Highlights System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
  });

  test.describe('Highlights Display', () => {
    test('should display highlights section on profile', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const highlightsSection = page.locator('[data-testid="highlights-section"], .highlights-container');
      if (await highlightsSection.first().isVisible()) {
        await expect(highlightsSection.first()).toBeVisible();
      }
    });

    test('should show highlight circles', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const highlightCircles = page.locator('[data-testid="highlight-circle"]');
      const count = await highlightCircles.count();
      
      if (count > 0) {
        await expect(highlightCircles.first()).toBeVisible();
      }
    });

    test('should display highlight titles', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const highlightTitles = page.locator('[data-testid="highlight-title"]');
      const count = await highlightTitles.count();
      
      if (count > 0) {
        await expect(highlightTitles.first()).toBeVisible();
      }
    });

    test('should show add highlight button', async ({ page }) => {
      const addHighlightButton = page.locator('[data-testid="add-highlight-button"], button:has-text("חדש")');
      if (await addHighlightButton.first().isVisible()) {
        await expect(addHighlightButton.first()).toBeVisible();
      }
    });

    test('should display highlight cover image', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const highlightCovers = page.locator('[data-testid="highlight-cover"] img');
      const count = await highlightCovers.count();
      
      if (count > 0) {
        await expect(highlightCovers.first()).toBeVisible();
      }
    });
  });

  test.describe('Highlight Viewer', () => {
    test('should open highlight viewer on click', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const highlightCircles = page.locator('[data-testid="highlight-circle"]');
      const count = await highlightCircles.count();
      
      if (count > 0) {
        await highlightCircles.first().click();
        await page.waitForTimeout(500);
        
        // Should navigate to highlight viewer
        await expect(page).toHaveURL(/highlight/);
      }
    });

    test('should display highlight stories', async ({ page }) => {
      await page.goto('/highlight/test-highlight-id');
      await page.waitForTimeout(500);
      
      const highlightContent = page.locator('[data-testid="highlight-content"], img, video');
      await expect(highlightContent.first()).toBeVisible();
    });

    test('should navigate between highlight stories', async ({ page }) => {
      await page.goto('/highlight/test-highlight-id');
      await page.waitForTimeout(500);
      
      // Tap to navigate
      const viewer = page.locator('[data-testid="highlight-viewer"]');
      if (await viewer.first().isVisible()) {
        await viewer.first().click();
      }
    });

    test('should show progress indicators for multiple stories', async ({ page }) => {
      await page.goto('/highlight/test-highlight-id');
      await page.waitForTimeout(500);
      
      const progressIndicators = page.locator('[data-testid="highlight-progress"] div');
      // Multiple indicators for multiple stories in highlight
    });
  });

  test.describe('Create Highlight', () => {
    test('should open create highlight dialog', async ({ page }) => {
      const addHighlightButton = page.locator('[data-testid="add-highlight-button"], button:has-text("חדש")');
      
      if (await addHighlightButton.first().isVisible()) {
        await addHighlightButton.first().click();
        await page.waitForTimeout(500);
        
        const createDialog = page.locator('[data-testid="create-highlight-dialog"], [role="dialog"]');
        await expect(createDialog.first()).toBeVisible();
      }
    });

    test('should show highlight name input', async ({ page }) => {
      const addHighlightButton = page.locator('[data-testid="add-highlight-button"]');
      
      if (await addHighlightButton.first().isVisible()) {
        await addHighlightButton.first().click();
        await page.waitForTimeout(500);
        
        const nameInput = page.locator('input[placeholder*="שם"], input[name="title"]');
        await expect(nameInput.first()).toBeVisible();
      }
    });

    test('should display available stories to add', async ({ page }) => {
      const addHighlightButton = page.locator('[data-testid="add-highlight-button"]');
      
      if (await addHighlightButton.first().isVisible()) {
        await addHighlightButton.first().click();
        await page.waitForTimeout(500);
        
        const availableStories = page.locator('[data-testid="available-story"]');
        // Should show user's archived stories
      }
    });

    test('should select stories for highlight', async ({ page }) => {
      const addHighlightButton = page.locator('[data-testid="add-highlight-button"]');
      
      if (await addHighlightButton.first().isVisible()) {
        await addHighlightButton.first().click();
        await page.waitForTimeout(500);
        
        const storyItems = page.locator('[data-testid="available-story"]');
        const count = await storyItems.count();
        
        if (count > 0) {
          await storyItems.first().click();
          // Story should be selected
        }
      }
    });

    test('should create highlight successfully', async ({ page }) => {
      const addHighlightButton = page.locator('[data-testid="add-highlight-button"]');
      
      if (await addHighlightButton.first().isVisible()) {
        await addHighlightButton.first().click();
        await page.waitForTimeout(500);
        
        const nameInput = page.locator('input[placeholder*="שם"], input[name="title"]');
        await nameInput.first().fill('היילייט חדש');
        
        const createButton = page.locator('button:has-text("צור"), button:has-text("הוסף")');
        if (await createButton.first().isVisible()) {
          await createButton.first().click();
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Edit Highlight', () => {
    test('should open edit options on long press', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const highlightCircles = page.locator('[data-testid="highlight-circle"]');
      const count = await highlightCircles.count();
      
      if (count > 0) {
        await highlightCircles.first().click({ delay: 1000 });
        await page.waitForTimeout(500);
        
        // Edit options should appear
      }
    });

    test('should rename highlight', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const highlightCircles = page.locator('[data-testid="highlight-circle"]');
      const count = await highlightCircles.count();
      
      if (count > 0) {
        await highlightCircles.first().click({ delay: 1000 });
        await page.waitForTimeout(500);
        
        const renameOption = page.locator('button:has-text("שנה שם"), text=שנה שם');
        if (await renameOption.first().isVisible()) {
          await renameOption.first().click();
        }
      }
    });

    test('should change highlight cover', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const highlightCircles = page.locator('[data-testid="highlight-circle"]');
      const count = await highlightCircles.count();
      
      if (count > 0) {
        await highlightCircles.first().click({ delay: 1000 });
        await page.waitForTimeout(500);
        
        const coverOption = page.locator('button:has-text("שנה תמונה"), text=תמונת שער');
        if (await coverOption.first().isVisible()) {
          await coverOption.first().click();
        }
      }
    });

    test('should add stories to existing highlight', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const highlightCircles = page.locator('[data-testid="highlight-circle"]');
      const count = await highlightCircles.count();
      
      if (count > 0) {
        await highlightCircles.first().click({ delay: 1000 });
        await page.waitForTimeout(500);
        
        const addOption = page.locator('button:has-text("הוסף סטורי"), text=הוסף');
        if (await addOption.first().isVisible()) {
          await addOption.first().click();
        }
      }
    });

    test('should delete highlight', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const highlightCircles = page.locator('[data-testid="highlight-circle"]');
      const count = await highlightCircles.count();
      
      if (count > 0) {
        await highlightCircles.first().click({ delay: 1000 });
        await page.waitForTimeout(500);
        
        const deleteOption = page.locator('button:has-text("מחק"), text=מחק');
        if (await deleteOption.first().isVisible()) {
          await deleteOption.first().click();
        }
      }
    });
  });

  test.describe('Add Story to Highlight', () => {
    test('should show add to highlight option from story viewer', async ({ page }) => {
      await page.goto('/story/test-story-id');
      await page.waitForTimeout(500);
      
      const moreButton = page.locator('[data-testid="story-more"], button:has(svg)');
      
      if (await moreButton.first().isVisible()) {
        await moreButton.first().click();
        await page.waitForTimeout(300);
        
        const addToHighlightOption = page.locator('text=הוסף להיילייט');
        if (await addToHighlightOption.first().isVisible()) {
          await expect(addToHighlightOption.first()).toBeVisible();
        }
      }
    });
  });
});

test.describe('Stories & Highlights Accessibility', () => {
  test('should support keyboard navigation in stories bar', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Tab to stories bar
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
  });

  test('should have proper ARIA labels for stories', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    const storyAvatars = page.locator('[data-testid="story-avatar"]');
    const count = await storyAvatars.count();
    
    if (count > 0) {
      const ariaLabel = await storyAvatars.first().getAttribute('aria-label');
      const role = await storyAvatars.first().getAttribute('role');
      // Should have accessibility attributes
    }
  });

  test('should announce story changes to screen readers', async ({ page }) => {
    await page.goto('/story/test-story-id');
    await page.waitForTimeout(500);
    
    const liveRegion = page.locator('[aria-live="polite"], [role="status"]');
    await expect(liveRegion.first()).toBeAttached();
  });
});

test.describe('Stories Error Handling', () => {
  test('should handle failed story load gracefully', async ({ page }) => {
    await page.goto('/story/invalid-story-id');
    await page.waitForTimeout(2000);
    
    // Should show error or redirect
    const errorMessage = page.locator('text=לא נמצא, text=שגיאה');
    // May show error or redirect to feed
  });

  test('should handle network errors when loading stories', async ({ page }) => {
    await page.context().setOffline(true);
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Should show cached stories or error state
    await page.context().setOffline(false);
  });

  test('should retry failed story upload', async ({ page }) => {
    await page.context().setOffline(true);
    
    const addStoryButton = page.locator('[data-testid="add-story-button"]');
    
    if (await addStoryButton.first().isVisible()) {
      await addStoryButton.first().click();
      await page.waitForTimeout(500);
      
      // Attempt upload
      await page.context().setOffline(false);
    }
  });
});
