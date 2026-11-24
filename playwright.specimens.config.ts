import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  testMatch: 'generate-specimens.runner.ts',
  timeout: 60000,
});
