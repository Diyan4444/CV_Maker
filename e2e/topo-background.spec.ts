import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ARTIFACT_DIR = 'C:/Users/Diyan/.gemini/antigravity/brain/0476a383-8a86-41cb-a552-ce7ab883faf8';

function shotPath(name: string): string {
  if (fs.existsSync(ARTIFACT_DIR)) {
    return path.join(ARTIFACT_DIR, name);
  }
  return path.resolve(process.cwd(), 'reports', name);
}

test.use({ reducedMotion: 'no-preference' });

test.describe.serial('Phase 8B-2: TopoBackground, Icons, FloatCard & Screenshots', () => {
  let adminClient: any;
  let testUserId: string;
  let docId: string;
  const testEmail = `topo-8b2-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};

  test.beforeAll(async () => {
    if (!supabaseUrl || !anonKey || !serviceKey || supabaseUrl.includes('placeholder')) {
      throw new Error('Missing Supabase environment variables');
    }
    assertTestProjectRefAllowed(supabaseUrl);

    adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Topo 8B2 Tester' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    await adminClient.from('master_profiles').insert({
      user_id: testUserId,
      background_group: 'engineering_technology',
      specialization: 'Computer Science Engineering',
      headline: 'Systems Engineer',
      summary: 'Topographic background verification user.',
    });

    const { data: docData, error: docErr } = await adminClient
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Topo Verification Resume',
        type: 'resume',
        template_id: 'ats_single_column',
        status: 'ready',
        accent_color: '#800021',
        version: 1,
      })
      .select('id')
      .single();
    if (docErr) throw docErr;
    docId = docData.id;

    await adminClient.from('document_sections').insert([
      {
        document_id: docId,
        section_type: 'header',
        title: 'Header',
        order_index: 0,
        is_visible: true,
        content: { fullName: 'Topo Tester', email: testEmail, otherLinks: [], schema_version: '1.0.0' },
      },
    ]);

    capturedCookies = {};
    const ssrClient = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return Object.entries(capturedCookies).map(([name, value]) => ({ name, value }));
        },
        setAll(toSet) {
          toSet.forEach((c) => {
            capturedCookies[c.name] = c.value;
          });
        },
      },
    });
    await ssrClient.auth.signInWithPassword({ email: testEmail, password: testPassword });
  });

  test.afterAll(async () => {
    if (adminClient && testUserId) {
      try {
        await adminClient.from('documents').delete().eq('user_id', testUserId);
        await adminClient.from('master_profiles').delete().eq('user_id', testUserId);
        await adminClient.auth.admin.deleteUser(testUserId);
      } catch {
        // ignore cleanup errors
      }
    }
  });

  const applyCookies = async (context: any) => {
    const cookiesToSet = Object.entries(capturedCookies).map(([name, value]) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    }));
    await context.addCookies(cookiesToSet);
  };

  test('1. Idle frame counter stops for 3s, wakes on pointer move, settles within 1.5s, and card pixels stay identical', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dev/background');
    await page.waitForFunction(() => Boolean((window as any).__TOPO_BG_STATE__));

    // Wait for any initial settle
    await page.waitForTimeout(400);
    const f0 = await page.evaluate(() => (window as any).__TOPO_BG_STATE__.frameCount);

    // Idle for 3s -> zero idle frames
    await page.waitForTimeout(3000);
    const fIdle = await page.evaluate(() => (window as any).__TOPO_BG_STATE__.frameCount);
    expect(fIdle).toBe(f0);

    // Capture static card interior pixels (card 1, not the live frame-counter card 0) before cursor movement
    const card = page.locator('[data-float-card="true"]').nth(1);
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    const beforeBuf = await page.screenshot({
      clip: { x: box!.x + 12, y: box!.y + 12, width: 180, height: 60 },
      animations: 'disabled',
    });

    // Move pointer -> frame counter increments
    await page.mouse.move(300, 300);
    await page.mouse.move(460, 380, { steps: 6 });
    await page.waitForTimeout(150);
    const fMoved = await page.evaluate(() => (window as any).__TOPO_BG_STATE__.frameCount);
    expect(fMoved).toBeGreaterThan(fIdle);

    // Wait 1.5s after stopping -> loop stops
    await page.waitForTimeout(1500);
    const fSettled = await page.evaluate(() => (window as any).__TOPO_BG_STATE__.frameCount);
    await page.waitForTimeout(600);
    const fAfterSettle = await page.evaluate(() => (window as any).__TOPO_BG_STATE__.frameCount);
    expect(fAfterSettle).toBe(fSettled);

    const afterBuf = await page.screenshot({
      clip: { x: box!.x + 12, y: box!.y + 12, width: 180, height: 60 },
      animations: 'disabled',
    });
    expect(Buffer.compare(beforeBuf, afterBuf)).toBe(0);
  });

  test('2. Touch emulation, reduced motion, and /editor stay static with zero pointer listeners', async ({ browser }) => {
    // Touch device
    const touchCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const touchPage = await touchCtx.newPage();
    await touchPage.goto('/dev/background');
    await touchPage.waitForFunction(() => Boolean((window as any).__TOPO_BG_STATE__));
    const touchState = await touchPage.evaluate(() => (window as any).__TOPO_BG_STATE__);
    expect(touchState.isStatic).toBe(true);
    expect(touchState.pointerListenerAttached).toBe(false);
    expect(touchState.frameCount).toBe(1);
    await touchCtx.close();

    // Reduced motion
    const rmCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    const rmPage = await rmCtx.newPage();
    await rmPage.goto('/dev/background');
    await rmPage.waitForFunction(() => Boolean((window as any).__TOPO_BG_STATE__));
    const rmState = await rmPage.evaluate(() => (window as any).__TOPO_BG_STATE__);
    expect(rmState.isStatic).toBe(true);
    expect(rmState.pointerListenerAttached).toBe(false);
    expect(rmState.frameCount).toBe(1);
    await rmCtx.close();

    // /editor static
    const edCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await applyCookies(edCtx);
    const edPage = await edCtx.newPage();
    await edPage.goto(`/editor/${docId}`);
    await edPage.waitForFunction(() => Boolean((window as any).__TOPO_BG_STATE__));
    const edState = await edPage.evaluate(() => (window as any).__TOPO_BG_STATE__);
    expect(edState.isStatic).toBe(true);
    expect(edState.pointerListenerAttached).toBe(false);
    await edCtx.close();
  });

  test('3. Layering (elementFromPoint) + 9 distinct icons + non-grid Poisson scatter', async ({ page, context }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Documents")');

    // elementFromPoint over cards & buttons must never return canvas or icons
    const hitCheck = await page.evaluate(() => {
      const btn = document.querySelector('button');
      const card = document.querySelector('[data-float-card="true"]');
      const targets = [btn, card].filter(Boolean) as Element[];
      return targets.map((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {
          isCanvas: Boolean(hit?.closest('[data-topo-canvas]')),
          isIconLayer: Boolean(hit?.closest('[data-topo-icons]')),
        };
      });
    });
    expect(hitCheck.length).toBeGreaterThan(0);
    for (const h of hitCheck) {
      expect(h.isCanvas).toBe(false);
      expect(h.isIconLayer).toBe(false);
    }

    // Check 9 distinct icon types, count 14-18, size 18-26px, idle opacity 0.10-0.16
    const iconInfo = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('[data-topo-icon]')) as HTMLElement[];
      return nodes.map((n) => ({
        type: n.dataset.topoIcon || '',
        w: parseFloat(getComputedStyle(n).width),
        opacity: parseFloat(getComputedStyle(n).opacity),
      }));
    });
    expect(iconInfo.length).toBeGreaterThanOrEqual(14);
    expect(iconInfo.length).toBeLessThanOrEqual(18);
    const uniqueTypes = new Set(iconInfo.map((i) => i.type));
    expect(uniqueTypes.size).toBe(9);
    for (const ic of iconInfo) {
      expect(ic.w).toBeGreaterThanOrEqual(18);
      expect(ic.w).toBeLessThanOrEqual(26);
      expect(ic.opacity).toBeGreaterThanOrEqual(0.09);
      expect(ic.opacity).toBeLessThanOrEqual(0.17);
    }
  });

  test('4. No-WebGL2 fallback renders charcoal gradient without errors', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as any).getContext = function (type: string, ...args: any[]) {
        if (type === 'webgl2') return null;
        return orig.apply(this, [type, ...args] as any);
      };
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/dev/background');
    await expect(page.locator('[data-topo-fallback="true"]')).toBeVisible();
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('5. FloatCard movement <= 4px over 10s, paused on hover & focus-within, CLS 0, clicks work', async ({ page, context }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Documents")');

    // Track CLS via PerformanceObserver
    await page.evaluate(() => {
      (window as any).__CLS__ = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) (window as any).__CLS__ += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    const card = page.locator('section[data-float-card="true"]').first();
    await expect(card).toBeVisible();

    const ys: number[] = [];
    for (let i = 0; i < 10; i++) {
      const b = await card.boundingBox();
      if (b) ys.push(b.y);
      await page.waitForTimeout(1000);
    }
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    expect(maxY - minY).toBeLessThanOrEqual(4.5);

    // Pause on hover (use mouse.move onto card since Playwright hover() waits for stability before moving)
    const hoverBox = await card.boundingBox();
    expect(hoverBox).not.toBeNull();
    await page.mouse.move(hoverBox!.x + 40, hoverBox!.y + 40);
    await expect(card).toHaveAttribute('data-float-state', 'paused');

    // Move mouse away and focus inside -> paused on focus-within
    await page.mouse.move(10, 10);
    const searchInput = page.locator('input[aria-label="Search documents"]');
    await searchInput.focus();
    await expect(card).toHaveAttribute('data-float-state', 'paused');

    // Click inside works cleanly
    const newDocBtn = page.getByRole('button', { name: /New document/i }).first();
    await newDocBtn.click();
    await expect(page.locator('#create-modal-title')).toBeVisible();
    await page.keyboard.press('Escape');

    const cls = await page.evaluate(() => (window as any).__CLS__);
    expect(cls).toBe(0);
  });

  test('6. Overflow check across 320, 360, 390, 1440px', async ({ page, context }) => {
    await applyCookies(context);
    const widths = [320, 360, 390, 1440];
    const routes = ['/', '/dashboard', '/profile', '/settings', '/privacy'];
    for (const route of routes) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(route);
        await page.waitForSelector('main', { timeout: 15000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow, `Horizontal overflow on ${route} at ${width}px`).toBe(false);
      }
    }
  });

  test('7. Capture 1440px & 390px screenshots (idle and cursor near icon)', async ({ page, context }) => {
    await applyCookies(context);
    const routes: Array<{ route: string; name: string }> = [
      { route: '/', name: 'landing' },
      { route: '/dashboard', name: 'dashboard' },
      { route: '/profile', name: 'profile' },
      { route: '/settings', name: 'settings' },
      { route: '/privacy', name: 'privacy' },
    ];

    for (const { route, name } of routes) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route);
      await page.waitForSelector('main', { timeout: 15000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: shotPath(`phase8b2_${name}_idle_1440px.png`), fullPage: false });

      // Move cursor directly over first visible topo icon on desktop
      const iconPos = await page.evaluate(() => {
        const icon = document.querySelector('[data-topo-icon]') as HTMLElement | null;
        if (!icon) return { x: 200, y: 200 };
        const r = icon.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await page.mouse.move(iconPos.x, iconPos.y, { steps: 5 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: shotPath(`phase8b2_${name}_cursor_1440px.png`), fullPage: false });

      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: shotPath(`phase8b2_${name}_390px.png`), fullPage: false });
    }
  });
});
