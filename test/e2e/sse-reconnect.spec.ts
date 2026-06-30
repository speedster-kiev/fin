import { test, expect } from '@playwright/test';

test('SSE reconnection: prices resume after connection drop', async ({ page }) => {
  await page.goto('/');

  // Wait for initial connection
  const status = page.locator('[data-testid="connection-status"]');
  await expect(status).toHaveAttribute('data-state', 'connected', { timeout: 10000 });

  // Simulate network offline then online
  await page.context().setOffline(true);
  await expect(status).toHaveAttribute('data-state', /connecting|disconnected/, { timeout: 5000 });

  await page.context().setOffline(false);

  // Should reconnect and resume prices
  await expect(status).toHaveAttribute('data-state', 'connected', { timeout: 15000 });

  // A price cell should still show a valid number after reconnect
  const priceLocator = page.locator('[data-testid="ticker-price"]').first();
  await expect(priceLocator).not.toBeEmpty({ timeout: 10000 });
});
