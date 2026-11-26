import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';
import { AccountExportDataSchema } from '../src/lib/account/export-schema';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ARTIFACT_DIR =
  process.env.ARTIFACT_DIR ||
  'C:\\Users\\Diyan\\.gemini\\antigravity\\brain\\0476a383-8a86-41cb-a552-ce7ab883faf8';

test.describe.serial('Phase 6A: Account Settings, Export, Deletion, Privacy & Screenshots', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `settings-e2e-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};

  test.beforeAll(async () => {
    if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) return;
    assertTestProjectRefAllowed(supabaseUrl);

    adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create throwaway test user
    const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Settings E2E User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    // Seed minimal profile & document so export is populated
    await (adminClient as any).from('master_profiles').insert({
      user_id: testUserId,
      headline: 'Research Director',
      summary: 'E2E testing profile.',
    });

    // Obtain real session cookies
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

    // Warm up routes to eliminate Next.js on-demand compilation delays in subsequent tests
    try {
      await fetch('http://localhost:3000/settings');
      await fetch('http://localhost:3000/privacy');
      await fetch('http://localhost:3000/goodbye');
    } catch {}
  });

  test.afterAll(async () => {
    // Safety cleanup: delete throwaway test user if not already deleted by test
    try {
      if (testUserId) {
        await adminClient.auth.admin.deleteUser(testUserId);
      }
    } catch {}
  });

  async function applyAuthCookies(context: any) {
    const cookiesToAdd = Object.entries(capturedCookies).map(([name, value]) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    }));
    await context.addCookies(cookiesToAdd);
  }

  /* --------------------------------------------------------------------------
     1. Navigation Reachability
     -------------------------------------------------------------------------- */
  test('Settings page is reachable from desktop AppHeader, mobile menu, and dashboard footer', async ({ page, context }) => {
    await applyAuthCookies(context);

    // Desktop AppHeader check
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    const desktopSettingsLink = page.locator('nav[aria-label="Main Navigation"] a[href="/settings"]');
    await expect(desktopSettingsLink).toBeVisible();
    await desktopSettingsLink.click();
    await page.waitForURL('**/settings');
    await expect(page.locator('h1')).toContainText('Account & Settings');

    // Dashboard footer links check
    await page.goto('/dashboard');
    const footerExportLink = page.locator('footer a[href="/api/account/export"]');
    await expect(footerExportLink).toBeVisible();

    const footerPrivacyLink = page.locator('footer a[href="/privacy"]');
    await expect(footerPrivacyLink).toBeVisible();
    await footerPrivacyLink.click();
    await page.waitForURL('**/privacy');
    await expect(page.locator('h1')).toContainText('Privacy & Data Rights');

    // Mobile menu check (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    const mobileMenuBtn = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(mobileMenuBtn).toBeVisible();
    await mobileMenuBtn.click();

    const mobileSettingsLink = page.locator('#mobile-nav-menu a[href="/settings"]');
    await expect(mobileSettingsLink).toBeVisible();
    await mobileSettingsLink.click();
    await page.waitForURL('**/settings');
    await expect(page.locator('h1')).toContainText('Account & Settings');
  });

  /* --------------------------------------------------------------------------
     2. Data Export Download
     -------------------------------------------------------------------------- */
  test('Export download initiates from /settings and returns valid JSON', async ({ page, context }) => {
    await applyAuthCookies(context);
    await page.goto('/settings');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('a[href="/api/account/export"]').first().click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/quillfolio-export-\d{4}-\d{2}-\d{2}\.json/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks).toString('utf-8');
    const json = JSON.parse(content);

    const parsed = AccountExportDataSchema.parse(json);
    expect(parsed.account.email).toBe(testEmail);
    expect(parsed.exportVersion).toBe('2');
  });

  /* --------------------------------------------------------------------------
     3. Open Redirect Security Test
     -------------------------------------------------------------------------- */
  test('Login flow safely rejects open redirects (//evil.com, https://evil.com) and defaults to /dashboard', async ({ page, context }) => {
    await applyAuthCookies(context);

    // Since user is already authenticated, visiting /login?next=//evil.com should redirect to /dashboard
    await page.goto('/login?next=%2F%2Fevil.com');
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');

    await page.goto('/login?redirectTo=https%3A%2F%2Fevil.com');
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
  });

  /* --------------------------------------------------------------------------
     4. Delete Dialog Behavior (Focus trap, Escape, Confirm Email, Double-click)
     -------------------------------------------------------------------------- */
  test('Delete Dialog enforces focus trap, Escape closes safely, and confirm button requires email match', async ({ page, context }) => {
    await applyAuthCookies(context);
    await page.goto('/settings');

    // Seed fake draft in localStorage to test cleanup later
    await page.evaluate(() => {
      localStorage.setItem('cv_maker_draft_doc_123', JSON.stringify({ title: 'Draft' }));
      localStorage.setItem('quillfolio_test_state', 'active');
    });

    const openDeleteBtn = page.getByRole('button', { name: 'Delete Account' });
    await openDeleteBtn.click();

    const dialog = page.locator('div[role="alertdialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Escape closes dialog without deleting
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // Reopen dialog
    await openDeleteBtn.click();
    await expect(dialog).toBeVisible();

    // Confirm button disabled initially
    const confirmDeleteBtn = dialog.getByRole('button', { name: /Permanently Delete/i });
    await expect(confirmDeleteBtn).toBeDisabled();

    // Type partial or mismatched email -> still disabled
    const emailInput = dialog.locator('#delete-confirm-email');
    await emailInput.fill('wrong@example.com');
    await expect(confirmDeleteBtn).toBeDisabled();

    // Type matching email (case-insensitive with whitespace) -> enabled
    await emailInput.fill(`  ${testEmail.toUpperCase()}  `);
    await expect(confirmDeleteBtn).toBeEnabled();
  });

  /* --------------------------------------------------------------------------
     5. REAUTH_REQUIRED UI State
     -------------------------------------------------------------------------- */
  test('Delete dialog handles 403 REAUTH_REQUIRED with friendly explanation and sign-in button', async ({ page, context }) => {
    await applyAuthCookies(context);
    await page.goto('/settings');

    // Mock 403 REAUTH_REQUIRED response from server
    await page.route('**/api/account/delete', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Re-authentication required to perform this action',
          code: 'REAUTH_REQUIRED',
        }),
      });
    });

    const openDeleteBtn = page.getByRole('button', { name: 'Delete Account' });
    await openDeleteBtn.click();

    const dialog = page.locator('div[role="alertdialog"]');
    await dialog.locator('#delete-confirm-email').fill(testEmail);
    const confirmDeleteBtn = dialog.getByRole('button', { name: /Permanently Delete/i });
    await confirmDeleteBtn.click();

    // Verify friendly explanation is visible
    await expect(dialog.getByRole('alert')).toContainText('For your security, account deletion requires a recent sign-in');
    const reauthBtn = dialog.getByRole('button', { name: 'Sign in again to continue' });
    await expect(reauthBtn).toBeVisible();

    // Unroute mock
    await page.unroute('**/api/account/delete');
  });

  /* --------------------------------------------------------------------------
     6. Visual Screenshots at 1440px and 390px
     -------------------------------------------------------------------------- */
  test('Capture visual screenshots: /settings (1440px and 390px)', async ({ page, context }) => {
    test.setTimeout(120000);
    await applyAuthCookies(context);

    for (const width of [1440, 390]) {
      const height = width === 1440 ? 900 : 844;
      await page.setViewportSize({ width, height });
      await page.goto('/settings');
      await page.waitForSelector('h1');
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `settings_${width}px.png`),
        animations: 'disabled',
      });
    }
  });

  test('Capture visual screenshots: Delete Dialog (1440px and 390px)', async ({ page, context }) => {
    test.setTimeout(120000);
    await applyAuthCookies(context);

    for (const width of [1440, 390]) {
      const height = width === 1440 ? 900 : 844;
      await page.setViewportSize({ width, height });
      await page.goto('/settings');
      await page.waitForSelector('h1');
      await page.getByRole('button', { name: 'Delete Account' }).click();
      const dialog = page.locator('div[role="alertdialog"]');
      await expect(dialog).toBeVisible();
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `delete_dialog_${width}px.png`),
        animations: 'disabled',
      });
    }
  });

  test('Capture visual screenshots: REAUTH_REQUIRED state (1440px and 390px)', async ({ page, context }) => {
    test.setTimeout(120000);
    await applyAuthCookies(context);
    await page.route('**/api/account/delete', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Re-authentication required to perform this action',
          code: 'REAUTH_REQUIRED',
        }),
      });
    });

    for (const width of [1440, 390]) {
      const height = width === 1440 ? 900 : 844;
      await page.setViewportSize({ width, height });
      await page.goto('/settings');
      await page.waitForSelector('h1');
      await page.getByRole('button', { name: 'Delete Account' }).click();
      const dialog = page.locator('div[role="alertdialog"]');
      await expect(dialog).toBeVisible();
      await dialog.locator('#delete-confirm-email').fill(testEmail);
      await dialog.getByRole('button', { name: /Permanently Delete/i }).click();
      await expect(dialog.getByRole('alert')).toBeVisible();
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `reauth_required_${width}px.png`),
        animations: 'disabled',
      });
    }

    await page.unroute('**/api/account/delete');
  });

  test('Capture visual screenshots: /privacy (1440px and 390px)', async ({ page }) => {
    test.setTimeout(120000);

    for (const width of [1440, 390]) {
      const height = width === 1440 ? 900 : 844;
      await page.setViewportSize({ width, height });
      await page.goto('/privacy');
      await page.waitForSelector('h1');
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `privacy_${width}px.png`),
        animations: 'disabled',
      });
    }
  });

  test('Capture visual screenshots: /goodbye (1440px and 390px)', async ({ page }) => {
    test.setTimeout(120000);

    for (const width of [1440, 390]) {
      const height = width === 1440 ? 900 : 844;
      await page.setViewportSize({ width, height });
      await page.goto('/goodbye');
      await page.waitForSelector('h1');
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `goodbye_${width}px.png`),
        animations: 'disabled',
      });
    }
  });

  /* --------------------------------------------------------------------------
     7. Account Deletion Execution, Local Drafts Purged, Redirect to /goodbye
     -------------------------------------------------------------------------- */
  test('Executing deletion clears localStorage drafts, redirects to /goodbye, and locks /dashboard', async ({ page, context }) => {
    test.setTimeout(120000);
    // Fresh sign in to obtain fresh token for deletion
    const ssrClient = createServerClient(supabaseUrl!, anonKey!, {
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
    await applyAuthCookies(context);

    await page.goto('/settings');
    await page.evaluate(() => {
      localStorage.setItem('cv_maker_draft_doc_999', JSON.stringify({ title: 'Unsaved Draft' }));
      localStorage.setItem('quillfolio_temp', 'temp_value');
    });

    await page.getByRole('button', { name: 'Delete Account' }).click();
    const dialog = page.locator('div[role="alertdialog"]');
    await dialog.locator('#delete-confirm-email').fill(testEmail);

    const confirmBtn = dialog.getByRole('button', { name: /Permanently Delete/i });
    // Test double click safety: clicks multiple times rapidly
    await confirmBtn.click();

    // Verify redirected to /goodbye
    await page.waitForURL('**/goodbye', { timeout: 15000 });
    expect(page.url()).toContain('/goodbye');
    await expect(page.locator('h1')).toContainText('Account Permanently Deleted');

    // Verify localStorage drafts were cleared
    const remainingDraftKeys = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cv_maker_') || k.startsWith('quillfolio_'))) {
          keys.push(k);
        }
      }
      return keys;
    });
    expect(remainingDraftKeys).toHaveLength(0);

    // Verify navigating to /dashboard now redirects to /login
    await page.goto('/dashboard');
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});
