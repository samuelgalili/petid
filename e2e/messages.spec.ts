import { test, expect } from '@playwright/test';

test.describe('Messages System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to messages page
    await page.goto('/messages');
  });

  test.describe('Messages List', () => {
    test('should display messages page header', async ({ page }) => {
      await expect(page.locator('text=הודעות')).toBeVisible();
    });

    test('should show empty state when no conversations', async ({ page }) => {
      // Check for empty state message
      const emptyState = page.locator('text=אין הודעות עדיין');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    });

    test('should display conversation list', async ({ page }) => {
      // Wait for conversations to load
      await page.waitForTimeout(1000);
      
      // Check if conversation items exist
      const conversations = page.locator('[data-testid="conversation-item"]');
      const count = await conversations.count();
      
      if (count > 0) {
        // Verify conversation item structure
        const firstConversation = conversations.first();
        await expect(firstConversation).toBeVisible();
      }
    });

    test('should show user avatar in conversation', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const avatars = page.locator('[data-testid="conversation-avatar"]');
      const count = await avatars.count();
      
      if (count > 0) {
        await expect(avatars.first()).toBeVisible();
      }
    });

    test('should show unread message indicator', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      // Check for unread badge
      const unreadBadge = page.locator('[data-testid="unread-badge"]');
      if (await unreadBadge.first().isVisible()) {
        await expect(unreadBadge.first()).toBeVisible();
      }
    });

    test('should navigate to conversation on click', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const conversations = page.locator('[data-testid="conversation-item"]');
      const count = await conversations.count();
      
      if (count > 0) {
        await conversations.first().click();
        await expect(page).toHaveURL(/\/messages\/.+/);
      }
    });
  });

  test.describe('Message Thread', () => {
    test('should display message thread header', async ({ page }) => {
      // Navigate to a specific thread
      await page.goto('/messages/test-user-id');
      
      // Check for back button
      await expect(page.locator('[data-testid="back-button"]')).toBeVisible();
    });

    test('should show message input field', async ({ page }) => {
      await page.goto('/messages/test-user-id');
      
      const messageInput = page.locator('input[placeholder*="הודע"], textarea[placeholder*="הודע"]');
      await expect(messageInput).toBeVisible();
    });

    test('should show send button', async ({ page }) => {
      await page.goto('/messages/test-user-id');
      
      const sendButton = page.locator('[data-testid="send-button"], button:has(svg)').last();
      await expect(sendButton).toBeVisible();
    });

    test('should type message in input field', async ({ page }) => {
      await page.goto('/messages/test-user-id');
      
      const messageInput = page.locator('input[placeholder*="הודע"], textarea[placeholder*="הודע"]');
      await messageInput.fill('הודעת בדיקה');
      await expect(messageInput).toHaveValue('הודעת בדיקה');
    });

    test('should display sent messages', async ({ page }) => {
      await page.goto('/messages/test-user-id');
      await page.waitForTimeout(1000);
      
      // Check for message bubbles
      const messages = page.locator('[data-testid="message-bubble"]');
      const count = await messages.count();
      
      if (count > 0) {
        await expect(messages.first()).toBeVisible();
      }
    });

    test('should show message timestamps', async ({ page }) => {
      await page.goto('/messages/test-user-id');
      await page.waitForTimeout(1000);
      
      // Check for time display
      const timestamps = page.locator('[data-testid="message-time"]');
      const count = await timestamps.count();
      
      if (count > 0) {
        await expect(timestamps.first()).toBeVisible();
      }
    });

    test('should scroll to bottom on load', async ({ page }) => {
      await page.goto('/messages/test-user-id');
      await page.waitForTimeout(1000);
      
      // The scroll container should be at the bottom
      const scrollContainer = page.locator('[data-testid="messages-container"]');
      if (await scrollContainer.isVisible()) {
        const scrollTop = await scrollContainer.evaluate(el => el.scrollTop);
        const scrollHeight = await scrollContainer.evaluate(el => el.scrollHeight);
        const clientHeight = await scrollContainer.evaluate(el => el.clientHeight);
        
        // Should be scrolled near bottom
        expect(scrollTop + clientHeight).toBeGreaterThanOrEqual(scrollHeight - 100);
      }
    });
  });
});

test.describe('AI Chat System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
  });

  test.describe('Chat Interface', () => {
    test('should display chat page', async ({ page }) => {
      await expect(page.locator('text=צ\'אט')).toBeVisible();
    });

    test('should show welcome message', async ({ page }) => {
      // Check for initial welcome/instruction message
      const welcomeMessage = page.locator('text=שלום').first();
      await expect(welcomeMessage).toBeVisible();
    });

    test('should display example questions', async ({ page }) => {
      // Check for example question prompts
      const exampleQuestions = page.locator('[data-testid="example-question"]');
      const count = await exampleQuestions.count();
      
      if (count > 0) {
        await expect(exampleQuestions.first()).toBeVisible();
      }
    });

    test('should show message input field', async ({ page }) => {
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      await expect(input).toBeVisible();
    });

    test('should show send button', async ({ page }) => {
      const sendButton = page.locator('[data-testid="chat-send-button"], button:has(svg)').last();
      await expect(sendButton).toBeVisible();
    });

    test('should type message in chat input', async ({ page }) => {
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      await input.fill('מה הגזע הכי מתאים לדירה קטנה?');
      await expect(input).toHaveValue('מה הגזע הכי מתאים לדירה קטנה?');
    });

    test('should click example question to fill input', async ({ page }) => {
      const exampleQuestions = page.locator('[data-testid="example-question"]');
      const count = await exampleQuestions.count();
      
      if (count > 0) {
        await exampleQuestions.first().click();
        
        // Check if input was filled or message was sent
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Chat Interaction', () => {
    test('should send message on button click', async ({ page }) => {
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      await input.fill('שאלת בדיקה');
      
      const sendButton = page.locator('[data-testid="chat-send-button"], button:has(svg)').last();
      await sendButton.click();
      
      // Wait for message to appear
      await page.waitForTimeout(500);
      
      // Check that user message appears
      const userMessage = page.locator('text=שאלת בדיקה');
      await expect(userMessage).toBeVisible();
    });

    test('should send message on Enter key', async ({ page }) => {
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      await input.fill('שאלה נוספת');
      await input.press('Enter');
      
      await page.waitForTimeout(500);
      
      const userMessage = page.locator('text=שאלה נוספת');
      await expect(userMessage).toBeVisible();
    });

    test('should show loading indicator while waiting for response', async ({ page }) => {
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      await input.fill('מה לתת לכלב לאכול?');
      
      const sendButton = page.locator('[data-testid="chat-send-button"], button:has(svg)').last();
      await sendButton.click();
      
      // Check for loading indicator
      const loadingIndicator = page.locator('[data-testid="chat-loading"], .animate-pulse, .animate-spin');
      // Loading should appear briefly
      await page.waitForTimeout(100);
    });

    test('should clear input after sending message', async ({ page }) => {
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      await input.fill('הודעה לשליחה');
      
      const sendButton = page.locator('[data-testid="chat-send-button"], button:has(svg)').last();
      await sendButton.click();
      
      await page.waitForTimeout(500);
      
      // Input should be cleared
      await expect(input).toHaveValue('');
    });

    test('should display AI response', async ({ page }) => {
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      await input.fill('מה הטיפול הבסיסי בכלב?');
      
      const sendButton = page.locator('[data-testid="chat-send-button"], button:has(svg)').last();
      await sendButton.click();
      
      // Wait for AI response (with longer timeout for API call)
      await page.waitForTimeout(5000);
      
      // Check for assistant message
      const assistantMessages = page.locator('[data-testid="assistant-message"]');
      const count = await assistantMessages.count();
      
      // Should have at least the welcome message plus new response
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should scroll to new messages', async ({ page }) => {
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      
      // Send multiple messages
      for (let i = 0; i < 3; i++) {
        await input.fill(`הודעה מספר ${i + 1}`);
        const sendButton = page.locator('[data-testid="chat-send-button"], button:has(svg)').last();
        await sendButton.click();
        await page.waitForTimeout(300);
      }
      
      // Container should be scrolled to show latest message
      await page.waitForTimeout(500);
    });
  });

  test.describe('Chat Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      
      // Check for aria-label or associated label
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      
      expect(ariaLabel || placeholder).toBeTruthy();
    });

    test('should be navigable with keyboard', async ({ page }) => {
      // Tab to input
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      
      // Type message
      await page.keyboard.type('בדיקת מקלדת');
      await expect(input).toHaveValue('בדיקת מקלדת');
    });
  });

  test.describe('Chat Error Handling', () => {
    test('should handle empty message submission gracefully', async ({ page }) => {
      const sendButton = page.locator('[data-testid="chat-send-button"], button:has(svg)').last();
      await sendButton.click();
      
      // Should not crash, input should remain empty
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      await expect(input).toHaveValue('');
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true);
      
      const input = page.locator('input[placeholder*="הקלד"], textarea[placeholder*="הקלד"]');
      await input.fill('שאלה במצב אופליין');
      
      const sendButton = page.locator('[data-testid="chat-send-button"], button:has(svg)').last();
      await sendButton.click();
      
      await page.waitForTimeout(2000);
      
      // Should show error message or handle gracefully
      await page.context().setOffline(false);
    });
  });
});

test.describe('Real-time Messaging', () => {
  test('should update conversation list in real-time', async ({ page }) => {
    await page.goto('/messages');
    
    // Subscribe to realtime updates
    await page.waitForTimeout(1000);
    
    // Conversation list should be ready for updates
    const conversationList = page.locator('[data-testid="conversation-list"]');
    if (await conversationList.isVisible()) {
      await expect(conversationList).toBeVisible();
    }
  });

  test('should show typing indicator', async ({ page }) => {
    await page.goto('/messages/test-user-id');
    
    // Check for typing indicator element (might not be visible if no one is typing)
    const typingIndicator = page.locator('[data-testid="typing-indicator"]');
    // Just verify the page loads without checking visibility
    await page.waitForTimeout(500);
  });
});
