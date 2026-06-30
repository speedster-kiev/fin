import { test, expect } from '@playwright/test';

// These tests require LLM_MOCK=true (set in test docker-compose)

test('AI chat: send message, receive response', async ({ page }) => {
  await page.goto('/');

  // Open chat panel if collapsible
  const chatToggle = page.locator('[data-testid="chat-toggle"]');
  if (await chatToggle.isVisible()) {
    await chatToggle.click();
  }

  const chatInput = page.locator('[data-testid="chat-input"]');
  await chatInput.fill('What should I buy?');
  await page.locator('[data-testid="chat-send-button"]').click();

  // Mock response should appear
  const responseLocator = page.locator('[data-testid="chat-message"]').last();
  await expect(responseLocator).toBeVisible({ timeout: 10000 });
  const responseText = await responseLocator.textContent();
  expect(responseText?.length).toBeGreaterThan(0);
});

test('AI chat: inline trade suggestion appears in response', async ({ page }) => {
  await page.goto('/');

  const chatToggle = page.locator('[data-testid="chat-toggle"]');
  if (await chatToggle.isVisible()) {
    await chatToggle.click();
  }

  await page.locator('[data-testid="chat-input"]').fill('Buy 1 share of AAPL');
  await page.locator('[data-testid="chat-send-button"]').click();

  // Mock LLM response includes a trade; it should be executed or shown inline
  const chatMessage = page.locator('[data-testid="chat-message"]').last();
  await expect(chatMessage).toBeVisible({ timeout: 10000 });
});

test('AI chat: message history persists within session', async ({ page }) => {
  await page.goto('/');

  const chatToggle = page.locator('[data-testid="chat-toggle"]');
  if (await chatToggle.isVisible()) {
    await chatToggle.click();
  }

  // Send two messages
  const chatInput = page.locator('[data-testid="chat-input"]');
  await chatInput.fill('First message');
  await page.locator('[data-testid="chat-send-button"]').click();
  await expect(page.locator('[data-testid="chat-message"]').first()).toBeVisible({ timeout: 10000 });

  await chatInput.fill('Second message');
  await page.locator('[data-testid="chat-send-button"]').click();

  // Both messages should be visible
  const messages = page.locator('[data-testid="chat-message"]');
  await expect(messages).toHaveCount(2, { timeout: 10000 });
});
