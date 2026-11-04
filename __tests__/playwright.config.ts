import { defineConfig } from '@playwright/test';
import { BASE_PATH } from '../packages/site/src/base.js';

const PORT = 4321;

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  workers: 4,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}${BASE_PATH}` },
  webServer: {
    command: `npx astro preview --root packages/site --port ${PORT}`,
    cwd: '..',
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: false,
  },
});
