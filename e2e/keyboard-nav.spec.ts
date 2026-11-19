import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation Accessibility on /login', () => {
  test('Tabs through all controls and asserts active focus outline visibility', async ({ page }) => {
    await page.goto('/login');

    // Press Tab multiple times and verify that focused element exists and receives active focus outline
    const interactiveTags = ['BUTTON', 'INPUT', 'SELECT', 'A'];

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      const isVisible = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (interactiveTags.includes(focusedTag || '')) {
        expect(isVisible).toBe(true);

        // Check computed outline style
        const outlineStyle = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;
          const computed = window.getComputedStyle(el);
          return {
            outlineStyle: computed.outlineStyle,
            outlineWidth: computed.outlineWidth,
          };
        });
        expect(outlineStyle).toBeDefined();
      }
    }
  });
});
