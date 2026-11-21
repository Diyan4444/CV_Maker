import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { assertTestProjectRefAllowed } from './src/lib/test-utils/production-guard';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });
assertTestProjectRefAllowed();

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'npm run build && npm run start -- -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 180000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-webgl',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
  ],
});
