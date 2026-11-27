import { test, expect } from '@playwright/test';

const ARTIFACT_DIR = 'C:/Users/Diyan/.gemini/antigravity/brain/0476a383-8a86-41cb-a552-ce7ab883faf8';

test.describe('Phase 8F: Landing Redesign, ScrollReveal, Overscroll & Motion', () => {
  test('JS-disabled progressive enhancement keeps all landing sections visible', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    for (const id of ['hero', 'how-it-works', 'templates', 'backgrounds', 'faq']) {
      const sec = page.locator(`#${id}`);
      await expect(sec).toBeAttached();
      const styles = await sec.evaluate((el) => ({
        opacity: getComputedStyle(el).opacity,
        inlineOpacity: (el as HTMLElement).style.opacity,
      }));
      expect(styles.opacity).toBe('1');
      expect(styles.inlineOpacity).toBe('');
    }

    await context.close();
  });

  test('desktop navbar indicator, CLS <= 0.01, scroll reveal, overscroll, and 1440/390 screenshots', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();

    // Inject CLS observer before navigation
    await page.addInitScript(() => {
      (window as any).__clsScore = 0;
      if (typeof PerformanceObserver !== 'undefined') {
        try {
          const po = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
              if (!entry.hadRecentInput) {
                (window as any).__clsScore += entry.value;
              }
            }
          });
          po.observe({ type: 'layout-shift', buffered: true });
        } catch {}
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Desktop indicator visible >= 1024px
    const indicator = page.locator('#nav-active-indicator');
    await expect(indicator).toBeAttached();

    // Overscroll at scrollY === 0 with negative wheel deltaY
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      (window as any).__maxOverscroll = 0;
      const el = document.getElementById('overscroll-wrapper');
      if (el) {
        const obs = new MutationObserver(() => {
          const val = Number(el.dataset.overscrollPx || '0');
          if (val > (window as any).__maxOverscroll) {
            (window as any).__maxOverscroll = val;
          }
        });
        obs.observe(el, { attributes: true, attributeFilter: ['data-overscroll-px'] });
        (window as any).__overscrollObs = obs;
      }
    });
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, -180);
    await page.waitForTimeout(100);
    const maxObserved = await page.evaluate(() => {
      (window as any).__overscrollObs?.disconnect();
      return (window as any).__maxOverscroll as number;
    });
    expect(maxObserved).toBeGreaterThan(0);
    expect(maxObserved).toBeLessThanOrEqual(56);

    // Wait for spring-back
    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            Number(document.getElementById('overscroll-wrapper')?.dataset.overscrollPx || '0')
          ),
        { timeout: 2000 }
      )
      .toBe(0);

    // Overscroll disabled when scrollY > 0
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(40);
    const scrolledPullPx = await page.evaluate(() => {
      return Number(document.getElementById('overscroll-wrapper')?.dataset.overscrollPx || '0');
    });
    expect(scrolledPullPx).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Scroll through sections and capture 1440px screenshots
    const sectionIds = ['hero', 'how-it-works', 'templates', 'backgrounds', 'faq'];
    for (const id of sectionIds) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(550);
      await page.screenshot({ path: `${ARTIFACT_DIR}/phase8f_1440_${id}.png` });
    }

    const cls = await page.evaluate(() => (window as any).__clsScore || 0);
    expect(cls).toBeLessThanOrEqual(0.01);

    // 390px mobile overflow + screenshots
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const overflow390 = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow390).toBe(false);
    for (const id of sectionIds) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${ARTIFACT_DIR}/phase8f_390_${id}.png` });
    }
    await context.close();
  });

  test('overscroll disabled under data-motion="off" and touch emulation', async ({ browser }) => {
    const touchCtx = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const touchPage = await touchCtx.newPage();
    await touchPage.goto('/', { waitUntil: 'domcontentloaded' });
    await touchPage.mouse.wheel(0, -180);
    await touchPage.waitForTimeout(60);
    const touchPull = await touchPage.evaluate(
      () => Number(document.getElementById('overscroll-wrapper')?.dataset.overscrollPx || '0')
    );
    expect(touchPull).toBe(0);
    await touchCtx.close();

    const reducedCtx = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 900 },
    });
    const reducedPage = await reducedCtx.newPage();
    await reducedPage.goto('/', { waitUntil: 'domcontentloaded' });
    await reducedPage.mouse.wheel(0, -180);
    await reducedPage.waitForTimeout(60);
    const reducedPull = await reducedPage.evaluate(
      () => Number(document.getElementById('overscroll-wrapper')?.dataset.overscrollPx || '0')
    );
    expect(reducedPull).toBe(0);
    await reducedCtx.close();
  });
});
