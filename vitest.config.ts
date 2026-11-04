import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/__tests__/*.test.ts', 'packages/*/scripts/__tests__/*.test.ts', '__tests__/*.test.ts'],
  },
});
