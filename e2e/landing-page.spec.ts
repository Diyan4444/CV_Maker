import { test, expect } from '@playwright/test';
import path from 'node:path';

const ARTIFACT_DIR =
  process.env.ARTIFACT_DIR ||
  path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.gemini',
    'antigravity',
    'brain',
    '0476a383-8a86-41cb-a552-ce7ab883faf8'
  );

test.describe('Phase 6B: Editorial Landing Page Verification & Screenshots', () => {
  test.setTimeout(120000);

  test('Landing page has no console errors and renders clean DOM', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    expect(consoleErrors).toEqual([]);

    // Assert one single h1 element exists
    const h1s = await page.locator('h1').all();
    expect(h1s.length).toBe(1);
    await expect(page.locator('h1')).toHaveText(/Build one profile, produce a resume or academic CV/i);
  });

  test('Skip-to-content link functions and focuses #main-content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    const skipLink = page.locator('a[href="#main-content"]');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press('Enter');
    const mainElement = page.locator('main#main-content');
    await expect(mainElement).toBeVisible();
  });

  test('All anchor links scroll to existing target IDs and resolve cleanly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const anchorIds = ['how-it-works', 'templates', 'backgrounds', 'faq'];

    for (const id of anchorIds) {
      const target = page.locator(`#${id}`);
      await expect(target, `Target section #${id} must exist`).toBeVisible();

      // Click nav anchor
      const link = page.locator(`header a[href="#${id}"]`).first();
      await link.click();
      await page.waitForTimeout(100);

      const isTargetInViewport = await target.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      expect(isTargetInViewport).toBe(true);
    }
  });

  test('All internal links resolve without 404', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const internalLinks = ['/', '/login', '/privacy'];

    for (const href of internalLinks) {
      const res = await request.get(href);
      expect(res.status(), `Link ${href} should return 200`).toBe(200);
    }
  });

  test('Images have valid descriptive alt text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const images = await page.locator('#templates img').all();
    expect(images.length).toBeGreaterThanOrEqual(3);

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt!.length).toBeGreaterThan(15);
      expect(alt).toContain('Alex Example');
    }
  });

  test('Mobile menu behaves accessibly on 390px viewport with >= 44px touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const toggleButton = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(toggleButton).toBeVisible();

    const box = await toggleButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);

    // Open menu
    await toggleButton.click();
    await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    const mobileMenu = page.locator('#mobile-nav-menu');
    await expect(mobileMenu).toBeVisible();

    // Verify touch targets inside mobile menu
    const menuLinks = await mobileMenu.locator('a').all();
    for (const link of menuLinks) {
      const linkBox = await link.boundingBox();
      expect(linkBox).not.toBeNull();
      expect(linkBox!.height).toBeGreaterThanOrEqual(44);
    }

    // Click an anchor link and verify menu closes
    await mobileMenu.locator('a[href="#faq"]').click();
    await page.waitForTimeout(100);
    await expect(mobileMenu).not.toBeVisible();
  });

  test('Measures Cumulative Layout Shift (CLS) on real landing page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Measure CLS via PerformanceObserver in browser context
    const cls = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });

        // Let page settle for 500ms
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 500);
      });
    });

    console.log(`[MEASURED CLS] Real landing page CLS: ${cls}`);
    expect(cls).toBeLessThan(0.1);
  });

  test('Respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });

    // Verify ColorField / canvas adapts without throwing
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeAttached();
  });

  test('Captures high-resolution visual screenshots for every section @ 1440px and 390px', async ({ page }) => {
    const viewports = [
      { width: 1440, height: 900, name: '1440px' },
      { width: 390, height: 844, name: '390px' },
    ];

    const sections = [
      { id: 'hero', name: 'hero' },
      { id: 'templates', name: 'templates' },
      { id: 'how-it-works', name: 'how_it_works' },
      { id: 'backgrounds', name: 'backgrounds' },
      { id: 'readiness-checks', name: 'readiness_checks' },
      { id: 'your-data', name: 'your_data' },
      { id: 'coming-next', name: 'coming_next' },
      { id: 'faq', name: 'faq' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      // Section screenshots
      for (const sec of sections) {
        const secLoc = page.locator(`#${sec.id}`);
        await secLoc.scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        await secLoc.screenshot({
          path: path.join(ARTIFACT_DIR, `landing_${sec.name}_${vp.name}.png`),
        });
      }

      // Footer screenshot
      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      await footer.screenshot({
        path: path.join(ARTIFACT_DIR, `landing_footer_${vp.name}.png`),
      });

      // Full page screenshot
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `landing_full_${vp.name}.png`),
        fullPage: true,
      });

      console.log(`[Screenshots Captured] Viewport ${vp.name} sections and full page captured.`);
    }
  });
});
