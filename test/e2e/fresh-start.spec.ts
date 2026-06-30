import { test, expect } from '@playwright/test';

test('fresh start: default watchlist with 10 tickers', async ({ page }) => {
  await page.goto('/');

  // Default tickers should be visible
  const defaultTickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'V', 'NFLX'];
  for (const ticker of defaultTickers) {
    await expect(page.getByText(ticker)).toBeVisible();
  }
});

test('fresh start: $10k cash balance', async ({ page }) => {
  await page.goto('/');
  // Cash balance should show $10,000 (allow formatting variations)
  await expect(page.getByText(/10[,.]?000/)).toBeVisible();
});

test('fresh start: prices are streaming via SSE', async ({ page }) => {
  await page.goto('/');

  // Wait for at least one price update — prices should be numeric and non-zero
  const priceLocator = page.locator('[data-testid="ticker-price"]').first();
  await expect(priceLocator).not.toBeEmpty();
  const priceText = await priceLocator.textContent();
  expect(Number(priceText?.replace(/[^0-9.]/g, ''))).toBeGreaterThan(0);
});

test('fresh start: connection status shows connected', async ({ page }) => {
  await page.goto('/');
  // Connection indicator should be green/connected after SSE starts
  const status = page.locator('[data-testid="connection-status"]');
  await expect(status).toHaveAttribute('data-state', 'connected', { timeout: 10000 });
});
