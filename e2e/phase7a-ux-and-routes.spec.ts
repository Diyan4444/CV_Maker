import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ARTIFACT_DIR =
  process.env.ARTIFACT_DIR ||
  'C:\\Users\\Diyan\\.gemini\\antigravity\\brain\\0476a383-8a86-41cb-a552-ce7ab883faf8';

test.describe('Phase 7A: Public Header/Footer, Anchors, Backgrounds, Toast & Login Errors', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `phase7a-e2e-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};

  test.beforeAll(async () => {
    if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) return;
    assertTestProjectRefAllowed(supabaseUrl);

    adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Phase 7A User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    const { error: mpErr } = await (adminClient as any).from('master_profiles').insert({
      user_id: testUserId,
      headline: 'Systems Engineer',
      summary: 'Testing Phase 7A features.',
    });
    if (mpErr) throw mpErr;

    capturedCookies = {};
    const ssrClient = createServerClient(supabaseUrl, anonKey!, {
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
    const { error: signErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signErr) throw signErr;
  });

  test.afterAll(async () => {
    if (testUserId && adminClient) {
      try {
        await adminClient.from('master_profiles').delete().eq('user_id', testUserId);
        await adminClient.auth.admin.deleteUser(testUserId);
      } catch {}
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

  for (const width of [1440, 390]) {
    test(`PublicHeader/Footer, sticky anchors & Privacy @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');

      // Verify footer copy on /
      const footer = page.locator('footer');
      await expect(footer).toContainText('Built by Diyan Shah');
      const mailLink = footer.locator('a[href="mailto:diyanshah2301@gmail.com"]');
      await expect(mailLink).toBeVisible();

      // Click every anchor in the header and assert target heading is below header bottom edge
      const anchors = [
        { label: 'How it works', headingId: 'how-it-works-heading' },
        { label: 'Templates', headingId: 'templates-heading' },
        { label: 'Backgrounds', headingId: 'backgrounds-heading' },
        { label: 'FAQ', headingId: 'faq-heading' },
      ];

      for (const anchor of anchors) {
        if (width < 768) {
          await page.locator('button[aria-label="Toggle navigation menu"]').click();
          await page.locator(`#mobile-nav-menu a:has-text("${anchor.label}")`).click();
        } else {
          await page.locator(`header nav[aria-label="Main Navigation"] a:has-text("${anchor.label}")`).click();
        }
        await expect.poll(async () => {
          const metrics = await page.evaluate((headingId) => {
            const header = document.querySelector('header');
            const heading = document.getElementById(headingId);
            if (!header || !heading) return null;
            const hRect = header.getBoundingClientRect();
            const tRect = heading.getBoundingClientRect();
            return {
              headerBottom: hRect.bottom,
              headingTop: tRect.top,
              headingBottom: tRect.bottom,
              viewportHeight: window.innerHeight,
            };
          }, anchor.headingId);
          if (!metrics) return false;
          return metrics.headingTop >= metrics.headerBottom - 1 && metrics.headingBottom <= metrics.viewportHeight;
        }, { timeout: 5000 }).toBe(true);

        if (anchor.label === 'How it works') {
          await page.screenshot({
            path: path.join(ARTIFACT_DIR, `header_anchor_${width}px.png`),
            animations: 'disabled',
          });
        }
      }

      // Click Privacy from landing -> keeps PublicHeader & PublicFooter
      if (width < 768) {
        await page.locator('button[aria-label="Toggle navigation menu"]').click();
        await page.locator('#mobile-nav-menu a:has-text("Privacy")').click();
      } else {
        await page.locator('header nav[aria-label="Main Navigation"] a:has-text("Privacy")').click();
      }
      await expect(page).toHaveURL(/\/privacy/);
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('footer')).toContainText('Built by Diyan Shah');

      // Verify privacy page has no cookie names or localStorage keys, and mentions Google sign-in + link
      const privacyText = await page.locator('main').innerText();
      expect(privacyText).not.toContain('sb-');
      expect(privacyText).not.toContain('cv_maker_draft_');
      expect(privacyText).toContain('Google');
      await expect(page.locator('a[href="https://policies.google.com/privacy"]')).toBeVisible();

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `privacy_7a_${width}px.png`),
        animations: 'disabled',
      });

      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `footer_${width}px.png`),
        animations: 'disabled',
      });

      // Click a landing anchor from /privacy -> returns to / and lands below header
      if (width < 768) {
        await page.locator('button[aria-label="Toggle navigation menu"]').click();
        await page.locator('#mobile-nav-menu a:has-text("Backgrounds")').click();
      } else {
        await page.locator('header nav[aria-label="Main Navigation"] a:has-text("Backgrounds")').click();
      }
      await expect(page).toHaveURL(/\/#backgrounds/);
      await page.waitForTimeout(500);
      const fromPrivacyMetrics = await page.evaluate(() => {
        const header = document.querySelector('header');
        const heading = document.getElementById('backgrounds-heading');
        if (!header || !heading) return null;
        return {
          headerBottom: header.getBoundingClientRect().bottom,
          headingTop: heading.getBoundingClientRect().top,
        };
      });
      expect(fromPrivacyMetrics).not.toBeNull();
      expect(fromPrivacyMetrics!.headingTop).toBeGreaterThanOrEqual(fromPrivacyMetrics!.headerBottom - 1);
    });
  }

  test('ColorField canvas or CSS fallback renders and is unoccluded on all routes + /settings screenshots', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    const routes = ['/', '/privacy', '/goodbye', '/login', '/dashboard', '/profile', '/settings'];

    for (const route of routes) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route);
      await page.waitForSelector('main', { timeout: 15000 });

      const bgState = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const fallback = document.querySelector('[data-colorfield-fallback]');
        const wrapper = document.querySelector('.min-h-screen');
        const wrapperBg = wrapper ? getComputedStyle(wrapper).backgroundColor : 'none';
        return {
          hasCanvasOrFallback: Boolean(canvas || fallback),
          wrapperBg,
        };
      });

      expect(bgState.hasCanvasOrFallback, `Expected ColorField on ${route}`).toBe(true);
      expect(bgState.wrapperBg).toBe('rgba(0, 0, 0, 0)');

      if (route === '/settings') {
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, 'settings_bg_1440px.png'),
          animations: 'disabled',
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, 'settings_bg_390px.png'),
          animations: 'disabled',
        });
      }
    }
  });

  test('Toast system: prompt add, Go to it focus, Undo, Save All Facts, 4s auto-dismiss, reduced motion & overflow', async ({
    page,
    context,
  }) => {
    await applyCookies(context);

    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/profile');
      await page.waitForSelector('h1', { timeout: 15000 });

      const promptBtn = page.locator('button:has-text("Hackathons")').first();
      await promptBtn.scrollIntoViewIfNeeded();
      await promptBtn.click();

      const liveRegion = page.locator('[aria-live="polite"]');
      const toast = liveRegion.locator('[role="status"]').last();
      await expect(toast).toBeVisible({ timeout: 200 });
      await expect(toast).toContainText('Added: Hackathons - fill it in below');

      // Check opaque panel background & 44px touch targets
      const toastStyles = await toast.evaluate((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        const buttons = Array.from(el.querySelectorAll('button')).map((b) => ({
          label: b.textContent?.trim() || b.getAttribute('aria-label'),
          height: b.getBoundingClientRect().height,
        }));
        return { bg, buttons, overflow: document.documentElement.scrollWidth > window.innerWidth };
      });
      expect(toastStyles.bg).toBe('rgb(218, 241, 222)'); // #DAF1DE
      expect(toastStyles.overflow).toBe(false);
      for (const b of toastStyles.buttons) {
        expect(b.height, `Button ${b.label} must be >= 44px`).toBeGreaterThanOrEqual(44);
      }

      if (width === 1440 || width === 390) {
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, `toast_${width}px.png`),
          animations: 'disabled',
        });
      }

      // Click Go to it -> focuses newly added entry input
      await toast.getByRole('button', { name: 'Go to it' }).click();
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'TEXTAREA', 'SELECT']).toContain(focusedTag);

      // Add another and test Undo restores prior count
      const beforeCount = await page.locator('[data-entry-id]').count();
      await promptBtn.scrollIntoViewIfNeeded();
      await promptBtn.click();
      const undoToast = liveRegion.locator('[role="status"]').last();
      await expect(undoToast).toBeVisible({ timeout: 200 });
      expect(await page.locator('[data-entry-id]').count()).toBe(beforeCount + 1);
      await undoToast.getByRole('button', { name: 'Undo' }).click();
      expect(await page.locator('[data-entry-id]').count()).toBe(beforeCount);
    }

    // Test Save All Facts toast & 4s auto-dismiss + reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Save All Facts' }).first().click();
    const saveToast = page
      .locator('[aria-live="polite"] [role="status"]')
      .filter({ hasText: 'synchronized successfully' })
      .last();
    await expect(saveToast).toBeVisible({ timeout: 10000 });

    // Auto-dismiss after 4s
    await expect(saveToast).not.toBeVisible({ timeout: 6000 });
  });

  test('Login page maps failed callback / expired link errors to plain text and strips URL params', async ({
    page,
  }) => {
    // 1. Failed callback
    await page.goto('/login?error=auth_callback_failed');
    const alert1 = page.locator('main [role="alert"]');
    await expect(alert1).toBeVisible();
    await expect(alert1).toContainText('We could not complete sign-in');
    expect(await alert1.innerText()).not.toContain('auth_callback_failed');
    await expect(page).toHaveURL(/\/login$/);

    // 2. Expired magic link
    await page.goto('/login?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    const alert2 = page.locator('main [role="alert"]');
    await expect(alert2).toBeVisible();
    await expect(alert2).toContainText('expired');
    expect(await alert2.innerText()).not.toContain('otp_expired');
    await expect(page).toHaveURL(/\/login$/);

    // 3. Hash fragment with token/error scrubbed from URL
    await page.goto('about:blank');
    await page.goto('/login#access_token=secret_leaked_token&error=access_denied');
    const alert3 = page.locator('main [role="alert"]');
    await expect(alert3).toBeVisible();
    await expect(alert3).toContainText('cancelled');
    expect(page.url()).not.toContain('access_token');
    expect(page.url()).not.toContain('secret_leaked_token');
  });
});
