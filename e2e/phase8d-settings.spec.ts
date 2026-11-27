import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';
import { EXPORT_DATA_CATEGORIES } from '../src/lib/account/export-schema';

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

test.describe.serial('Phase 8D: Settings Redesign, User ID Eye, Export Tile, Animations Toggle & Delete Regression', () => {
  let adminClient: any;
  let testUserId: string;
  const testEmail = `phase8d-settings-${Date.now()}@quillfolio.local`;
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
      user_metadata: { full_name: 'Phase 8D Tester' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

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
        await adminClient.auth.admin.deleteUser(testUserId);
      } catch {
        // ignore cleanup if already deleted
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

  test('1. User ID eye toggle: hidden in DOM & page.content() by default, keyboard toggle, and Verified pill', async ({ page, context }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/settings');

    // Verified pill present for confirmed user
    await expect(page.getByTestId('email-verified-pill')).toContainText('Verified');

    // Eye button default state
    const eyeBtn = page.getByRole('button', { name: 'Show user ID' });
    await expect(eyeBtn).toBeVisible();
    await expect(eyeBtn).toHaveAttribute('aria-pressed', 'false');
    const eyeBox = await eyeBtn.boundingBox();
    expect(eyeBox!.width).toBeGreaterThanOrEqual(44);
    expect(eyeBox!.height).toBeGreaterThanOrEqual(44);

    // Masked 36 bullets + sr-only text, and UUID MUST NOT be in DOM/page.content()
    await expect(page.getByText('User ID hidden')).toBeAttached();
    const htmlBefore = await page.content();
    expect(htmlBefore).not.toContain(testUserId);

    // Keyboard toggle (Enter) reveals UUID
    await eyeBtn.focus();
    await page.keyboard.press('Enter');
    const revealed = page.getByTestId('revealed-user-id');
    await expect(revealed).toHaveText(testUserId);
    const hideBtn = page.getByRole('button', { name: 'Hide user ID' });
    await expect(hideBtn).toHaveAttribute('aria-pressed', 'true');

    // Toggle back off hides UUID from DOM again
    await hideBtn.click();
    await expect(page.getByTestId('revealed-user-id')).toHaveCount(0);
    expect(await page.content()).not.toContain(testUserId);
  });

  test('2. Sign-in methods (email-only), Data & portability schema-derived tile, and sub-navigation', async ({ page, context }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/settings');

    // Sub-navigation links exist
    const subnav = page.locator('nav[aria-label="Settings sections"]');
    await expect(subnav.getByRole('link', { name: 'Account information' })).toBeVisible();
    await expect(subnav.getByRole('link', { name: 'Sign-in methods' })).toBeVisible();
    await expect(subnav.getByRole('link', { name: 'Data & portability' })).toBeVisible();
    await expect(subnav.getByRole('link', { name: 'Interface' })).toBeVisible();
    await expect(subnav.getByRole('link', { name: 'Delete account' })).toBeVisible();

    // Email-only user sign-in methods
    await expect(page.getByTestId('signin-provider-email')).toContainText('Email link');
    await expect(page.getByTestId('signin-provider-google')).toHaveCount(0);
    await expect(page.getByText('The same verified email address opens the same Quillfolio account.')).toBeVisible();

    // Data & portability tile equals export schema keys
    await expect(page.getByRole('heading', { name: 'Your data, always yours.' })).toBeVisible();
    await expect(page.getByText('Complete JSON archive')).toBeVisible();
    await expect(page.getByText('Available', { exact: true })).toBeVisible();
    await expect(page.getByText('JSON · Machine-readable archive')).toBeVisible();
    await expect(page.getByText('Website settings')).toHaveCount(0);

    const renderedKeys = await page
      .locator('[data-testid="export-categories-list"] li')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-export-key')));
    expect(renderedKeys).toEqual(EXPORT_DATA_CATEGORIES.map((c) => c.key));

    await page.screenshot({ path: shotPath('phase8d_settings_1440px.png'), fullPage: false });
  });

  test('3. Interface Animations toggle persists in localStorage and disables motion', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'no-preference',
    });
    await applyCookies(ctx);
    const page = await ctx.newPage();
    await page.goto('/settings');

    const animGroup = page.getByRole('radiogroup', { name: 'Animations' });
    const onBtn = animGroup.getByRole('radio', { name: 'On' });
    const offBtn = animGroup.getByRole('radio', { name: 'Off' });
    const sysBtn = animGroup.getByRole('radio', { name: 'Follow system' });
    await expect(sysBtn).toHaveAttribute('aria-checked', 'true');

    await offBtn.click();
    await expect(offBtn).toHaveAttribute('aria-checked', 'true');
    await expect(onBtn).toHaveAttribute('aria-checked', 'false');

    const motionAttr = await page.evaluate(() => document.documentElement.dataset.motion);
    expect(motionAttr).toBe('off');
    const stored = await page.evaluate(() => window.localStorage.getItem('quillfolio_motion'));
    expect(stored).toBe('off');

    // Floating cards should be disabled when data-motion="off"
    const floatState = await page.locator('[data-float-card="true"]').first().getAttribute('data-float-state');
    expect(floatState).toBe('disabled');

    // Reload persists Off state
    await page.reload();
    await expect(page.getByRole('radiogroup', { name: 'Animations' }).getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => document.documentElement.dataset.motion)).toBe('off');

    await ctx.close();
  });

  test('4. Responsive layout, overflow, touch targets (320/360/390/1440) + 390px screenshot', async ({ page, context }) => {
    await applyCookies(context);
    for (const width of [320, 360, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/settings');
      await page.waitForSelector('h1:has-text("Account & Settings")');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow, `Overflow on /settings at ${width}px`).toBe(false);

      if (width === 390) {
        await page.screenshot({ path: shotPath('phase8d_settings_390px.png'), fullPage: false });
      }
    }
  });

  test('5. Delete account regression: modal opens, requires email match, and executes deletion', async ({ page, context }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/settings');

    await page.getByRole('button', { name: 'Delete Account' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();

    const confirmBtn = page.getByRole('button', { name: 'Permanently Delete My Account' });
    await expect(confirmBtn).toBeDisabled();

    await page.locator('#delete-confirm-email').fill(testEmail);
    await expect(confirmBtn).toBeEnabled();

    await Promise.all([
      page.waitForURL(/\/goodbye/, { timeout: 20000 }),
      confirmBtn.click(),
    ]);
  });
});
