import { defineConfig } from '@playwright/test';

const PORT = 4321;

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  workers: 4,
  reporter: 'list',
  // CHROMIUM_PATH points to an installed Chromium when the one that matches this Playwright version is not installed.
  use: { baseURL: `http://localhost:${PORT}/NelkeData/`, launchOptions: { executablePath: process.env.CHROMIUM_PATH } },
  webServer: {
    command: `npx astro preview --root packages/site --port ${PORT}`,
    cwd: '..',
    url: `http://localhost:${PORT}/NelkeData/`,
    reuseExistingServer: false,
  },
});
