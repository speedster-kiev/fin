import { test, expect } from '@playwright/test';

async function getCash(page: any): Promise<number> {
  const cashText = await page.locator('[data-testid="cash-balance"]').textContent();
  return Number(cashText?.replace(/[^0-9.]/g, ''));
}

test('buy shares: cash decreases, position appears', async ({ page }) => {
  await page.goto('/');

  const cashBefore = await getCash(page);
  expect(cashBefore).toBeGreaterThan(0);

  // Fill trade bar
  await page.locator('[data-testid="trade-ticker-input"]').fill('AAPL');
  await page.locator('[data-testid="trade-quantity-input"]').fill('1');
  await page.locator('[data-testid="trade-buy-button"]').click();

  // Wait for confirmation
  await expect(page.locator('[data-testid="trade-feedback"]')).toBeVisible();

  const cashAfter = await getCash(page);
  expect(cashAfter).toBeLessThan(cashBefore);

  // Position should appear in portfolio
  await expect(page.locator('[data-testid="position-AAPL"]')).toBeVisible();
});

test('sell shares: cash increases, position updates', async ({ page }) => {
  await page.goto('/');

  // First buy a share
  await page.locator('[data-testid="trade-ticker-input"]').fill('MSFT');
  await page.locator('[data-testid="trade-quantity-input"]').fill('2');
  await page.locator('[data-testid="trade-buy-button"]').click();
  await expect(page.locator('[data-testid="trade-feedback"]')).toBeVisible();

  const cashAfterBuy = await getCash(page);

  // Now sell 1 share
  await page.locator('[data-testid="trade-ticker-input"]').fill('MSFT');
  await page.locator('[data-testid="trade-quantity-input"]').fill('1');
  await page.locator('[data-testid="trade-sell-button"]').click();
  await expect(page.locator('[data-testid="trade-feedback"]')).toBeVisible();

  const cashAfterSell = await getCash(page);
  expect(cashAfterSell).toBeGreaterThan(cashAfterBuy);

  // Position should still exist (we sold 1 of 2)
  await expect(page.locator('[data-testid="position-MSFT"]')).toBeVisible();
});

test('sell more shares than owned is rejected', async ({ page }) => {
  await page.goto('/');

  // Attempt to sell TSLA without owning any
  await page.locator('[data-testid="trade-ticker-input"]').fill('TSLA');
  await page.locator('[data-testid="trade-quantity-input"]').fill('100');
  await page.locator('[data-testid="trade-sell-button"]').click();

  // Should show error feedback, not succeed
  const feedback = page.locator('[data-testid="trade-feedback"]');
  await expect(feedback).toBeVisible();
  const feedbackText = await feedback.textContent();
  expect(feedbackText?.toLowerCase()).toMatch(/insufficient|error|fail/);
});
