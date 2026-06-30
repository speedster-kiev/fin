import { test, expect } from '@playwright/test';

test('add ticker to watchlist', async ({ page }) => {
  await page.goto('/');

  // Add a ticker not in the default list
  const addInput = page.locator('[data-testid="watchlist-add-input"]');
  await addInput.fill('ORCL');
  await page.locator('[data-testid="watchlist-add-button"]').click();

  await expect(page.getByText('ORCL')).toBeVisible();
});

test('remove ticker from watchlist', async ({ page }) => {
  await page.goto('/');

  // Remove NFLX from the watchlist
  const removeButton = page.locator('[data-testid="watchlist-remove-NFLX"]');
  await removeButton.click();

  await expect(page.getByText('NFLX')).not.toBeVisible({ timeout: 3000 });
});

test('add duplicate ticker is handled gracefully', async ({ page }) => {
  await page.goto('/');

  const addInput = page.locator('[data-testid="watchlist-add-input"]');
  await addInput.fill('AAPL');
  await page.locator('[data-testid="watchlist-add-button"]').click();

  // Should still only show one AAPL entry
  const aaplItems = await page.locator('[data-testid="watchlist-item-AAPL"]').count();
  expect(aaplItems).toBeLessThanOrEqual(1);
});
