import { defineConfig, devices } from '@playwright/test';

// Smoke tests run against the built site in dist/ (run `npx astro build` first; CI does).
export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // PW_CHROMIUM points at a preinstalled Chromium (cloud sessions); CI installs the matching one instead.
  use: {
    baseURL: 'http://localhost:4321',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: 'node tests/serve-dist.mjs',
    url: 'http://localhost:4321/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
