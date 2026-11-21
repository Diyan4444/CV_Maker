import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'src/tests/integration/**'],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
