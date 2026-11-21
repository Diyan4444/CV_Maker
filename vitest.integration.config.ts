import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/tests/integration/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'src/tests/integration/global-setup.ts'],
    globalSetup: ['./src/tests/integration/global-setup.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
