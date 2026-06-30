import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8000',
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../results/html' }]],
});
