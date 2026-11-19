import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve(process.cwd(), 'screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [
  { name: '1440px', width: 1440, height: 900 },
  { name: '390px', width: 390, height: 844 },
];

const themes = ['mist', 'ink'];

test.describe('Visual Screenshot Capture & Overflow Detection', () => {
  for (const vp of viewports) {
    for (const theme of themes) {
      test(`Captures /, /login, /onboarding specializations in ${vp.name} (${theme})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Helper to set theme on html element
        const setTheme = async () => {
          await page.evaluate((t) => {
            document.documentElement.setAttribute('data-theme', t);
          }, theme);
        };

        // 1. Landing Page (/)
        await page.goto('http://localhost:3000/');
        await setTheme();
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(outDir, `landing_${theme}_${vp.name}.png`), fullPage: true });

        // Check horizontal overflow
        const landingOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(landingOverflow, `Horizontal overflow detected on / at ${vp.name} (${theme})`).toBe(false);

        // 2. Login Page (/login)
        await page.goto('http://localhost:3000/login');
        await setTheme();
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(outDir, `login_${theme}_${vp.name}.png`), fullPage: true });

        const loginOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(loginOverflow, `Horizontal overflow detected on /login at ${vp.name} (${theme})`).toBe(false);

        // 3. Onboarding (/onboarding) - Step 0 and Department Specializations
        await page.goto('http://localhost:3000/onboarding');
        await setTheme();

        // 3a. Mechanical Engineering
        await page.selectOption('select', { label: 'Mechanical Engineering' }).catch(() => {});
        // click 'Next: Department Questions'
        const nextBtn = page.getByRole('button', { name: /Next:/i });
        if (await nextBtn.isVisible()) {
          // Select Mechanical Engineering
          await page.locator('select').selectOption('Mechanical Engineering');
          await nextBtn.click();
          await page.waitForTimeout(200);
          await page.screenshot({ path: path.join(outDir, `onboarding_mech_${theme}_${vp.name}.png`), fullPage: true });
          const mechOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
          expect(mechOverflow).toBe(false);

          // Go back
          await page.getByRole('button', { name: /Back/i }).click();
        }

        // 3b. Finance
        await page.locator('button:has-text("Commerce and Management"), button:has-text("Commerce & Management")').click().catch(() => {});
        await page.locator('select').selectOption('Finance').catch(() => {});
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(200);
          await page.screenshot({ path: path.join(outDir, `onboarding_finance_${theme}_${vp.name}.png`), fullPage: true });
          const finOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
          expect(finOverflow).toBe(false);
          await page.getByRole('button', { name: /Back/i }).click();
        }

        // 3c. Psychology
        await page.locator('button:has-text("Arts and Humanities"), button:has-text("Arts & Humanities")').click().catch(() => {});
        await page.locator('select').selectOption('Psychology').catch(() => {});
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(200);
          await page.screenshot({ path: path.join(outDir, `onboarding_psychology_${theme}_${vp.name}.png`), fullPage: true });
          const psychOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
          expect(psychOverflow).toBe(false);
          await page.getByRole('button', { name: /Back/i }).click();
        }

        // 3d. Other (type your own)
        await page.locator('button:has-text("Other")').first().click().catch(() => {});
        await page.locator('select').selectOption('Other (type your own)').catch(() => {});
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(200);
          await page.screenshot({ path: path.join(outDir, `onboarding_other_${theme}_${vp.name}.png`), fullPage: true });
          const otherOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
          expect(otherOverflow).toBe(false);
        }
      });
    }
  }
});
