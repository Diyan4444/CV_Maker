import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation Accessibility Audit', () => {
  const publicPages = ['/', '/login'];

  for (const pagePath of publicPages) {
    test(`Tabs through controls on ${pagePath} and asserts visible active focus state`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      const firstInteractive = page.locator('button, input, select, a').first();
      await expect(firstInteractive).toBeVisible();
      await firstInteractive.focus();

      const interactiveTags = ['BUTTON', 'INPUT', 'SELECT', 'A', 'TEXTAREA'];
      let interactiveEncountered = 0;

      for (let i = 0; i < 6; i++) {
        const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
        const isVisible = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

        if (interactiveTags.includes(focusedTag || '')) {
          interactiveEncountered++;
          expect(isVisible).toBe(true);

          const focusIndicators = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el) return null;
            const cs = window.getComputedStyle(el);
            return {
              outlineStyle: cs.outlineStyle,
              outlineWidth: cs.outlineWidth,
              boxShadow: cs.boxShadow,
            };
          });

          expect(focusIndicators).toBeDefined();
        }

        await page.keyboard.press('Tab');
      }

      expect(interactiveEncountered).toBeGreaterThan(0);
    });
  }
});
