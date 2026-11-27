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

test.describe.serial('Phase 8G Cross-Browser Verification (Chromium, Firefox, WebKit)', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId = '';
  const testEmail = `phase8g-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  const capturedCookies: Record<string, string> = {};
  let docId = '';

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
      user_metadata: { full_name: 'Ada CrossBrowser' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    const { data: profileRecord, error: profErr } = await (adminClient as any)
      .from('master_profiles')
      .insert({
        user_id: testUserId,
        background_group: 'Engineering and Technology',
        specialization: 'Computer Science Engineering',
        headline: 'Systems Architect',
        summary: 'Cross-browser verified systems engineer.',
      })
      .select('id')
      .single();
    if (profErr) throw profErr;

    await (adminClient as any).from('experiences').insert({
      profile_id: profileRecord.id,
      type: 'work',
      role: 'Staff Engineer',
      organization: 'Browser Lab',
      start_date: '2022-01',
      is_current: true,
      bullets: ['Verified cross-browser PDF preview and editor flows.'],
    });

    const ssrClient = createServerClient(supabaseUrl!, anonKey!, {
      cookies: {
        getAll: () => Object.entries(capturedCookies).map(([name, value]) => ({ name, value })),
        setAll: (list) => list.forEach(({ name, value }) => (capturedCookies[name] = value)),
      },
    });
    const { error: signInErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInErr) throw signInErr;
  });

  test.afterAll(async () => {
    if (adminClient && testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  async function addCookies(context: any) {
    await context.addCookies(
      Object.entries(capturedCookies).map(([name, value]) => ({
        name,
        value,
        domain: 'localhost',
        path: '/',
      }))
    );
  }

  test('1. Landing page renders with glass on', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#hero-heading')).toBeVisible();
    const heroOpacity = await page.locator('#hero').evaluate((el) => getComputedStyle(el).opacity);
    expect(heroOpacity).toBe('1');
  });

  test('2. Login page renders', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('form')).toBeVisible();
  });

  test('3. Dashboard template chooser renders with glass on', async ({ page, context }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) test.skip();
    await addCookies(context);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /New Document/i }).first().click();
    await expect(page.getByRole('heading', { name: /Create New Document/i })).toBeVisible();
    await expect(page.locator('img[alt*="specimen preview"]').first()).toBeVisible();
  });

  test('4. Settings page renders with glass on and interface controls', async ({ page, context }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) test.skip();
    await addCookies(context);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Account & Settings/i })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Glass' })).toBeVisible();
  });

  test('5. Onboarding wizard renders', async ({ page, context }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) test.skip();
    await addCookies(context);
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'What are you building first?' })).toBeVisible();
  });

  test('6. Editor load, edit, save and live preview', async ({ page, context }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) test.skip();
    await addCookies(context);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /New Document/i }).first().click();
    await page.fill('#doc-title', 'Cross Browser Resume');
    await page.getByRole('button', { name: /Create & Open/i }).click();
    await page.waitForURL(/\/editor\/[a-f0-9-]+/, { timeout: 30000 });
    docId = page.url().split('/editor/')[1].split('?')[0];
    expect(docId).toBeTruthy();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('#pdf-preview-canvas-container canvas').first()).toBeVisible({
      timeout: 30000,
    });
    const titleInput = page.locator('input[aria-label="Document Title"]');
    await titleInput.fill('Cross Browser Edited');
    await page.locator('#toolbar-btn-save').click();
    await expect(page.locator('#save-status-slot')).toContainText('Saved', { timeout: 15000 });
  });

  test('7. Fallback: no WebGL2 renders static background', async ({ page }) => {
    await page.addInitScript(() => {
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as any).getContext = function (type: string, ...args: any[]) {
        if (type === 'webgl2') return null;
        return origGetContext.apply(this, [type, ...args] as any);
      };
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-topo-fallback="true"]')).toBeVisible();
  });

  test('8. Fallback: no backdrop-filter (solid) on landing, dashboard and settings', async ({
    page,
    context,
  }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('quillfolio_glass', 'solid');
      } catch {}
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-glass', 'solid');

    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      await addCookies(context);
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-glass', 'solid');
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-glass', 'solid');
    }
  });

  test('9. Fallback: reduced motion disables float animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  });
});
