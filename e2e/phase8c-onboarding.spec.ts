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

test.describe.serial('Phase 8C: Onboarding Redesign & Full Wizard DB Parity', () => {
  let adminClient: any;
  let testUserId: string;
  const testEmail = `phase8c-onboard-${Date.now()}@quillfolio.local`;
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
      user_metadata: { full_name: 'Phase 8C Tester' },
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
        await adminClient.from('documents').delete().eq('user_id', testUserId);
        await adminClient.from('master_profiles').delete().eq('user_id', testUserId);
        await adminClient.auth.admin.deleteUser(testUserId);
      } catch {
        // ignore cleanup
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

  test('1. Copy strings, specimen images, and radiogroup keyboard navigation', async ({ page, context }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/onboarding');

    await expect(page.locator('h1')).toContainText('What are you building first?');
    await expect(page.getByText('01')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your background' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Where are you right now?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What are you working toward?' })).toBeVisible();

    // Old copy must be gone
    await expect(page.getByText('Educational / Professional Background')).toHaveCount(0);
    await expect(page.getByText('Current Career / Academic Stage')).toHaveCount(0);
    await expect(page.getByText('Primary Purposes')).toHaveCount(0);

    // Specimens load via next/image
    const imgs = page.locator('[role="radiogroup"] img');
    await expect(imgs).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      const natW = await imgs.nth(i).evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(natW).toBeGreaterThan(0);
    }

    // Radiogroup keyboard navigation
    const radios = page.locator('[role="radiogroup"] [role="radio"]');
    await expect(radios).toHaveCount(2);
    await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect(radios.nth(0)).toContainText('Selected');

    await radios.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect(radios.nth(1)).toContainText('Selected');
    await expect(radios.nth(1)).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect(radios.nth(0)).toBeFocused();
  });

  test('2. Combobox ARIA 1.2 keyboard, search filtering, and Other field reveal', async ({ page, context }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/onboarding');

    const specCombo = page.locator('#spec-select');
    await expect(specCombo).toHaveAttribute('role', 'combobox');
    await specCombo.click();
    await expect(specCombo).toHaveAttribute('aria-expanded', 'true');

    // Home / End / ArrowDown / Escape
    await page.keyboard.press('Home');
    const firstActive = await specCombo.getAttribute('aria-activedescendant');
    expect(firstActive).toBeTruthy();

    await page.keyboard.press('End');
    const lastActive = await specCombo.getAttribute('aria-activedescendant');
    expect(lastActive).not.toBe(firstActive);

    await page.keyboard.press('Escape');
    await expect(specCombo).toHaveAttribute('aria-expanded', 'false');

    // Type-ahead filter for Other (type your own)
    await specCombo.click();
    await specCombo.fill('Other');
    await page.keyboard.press('Enter');

    const customInput = page.locator('input[aria-label="Custom specialization"]');
    await expect(customInput).toBeVisible();
    await customInput.fill('Distributed Systems');
    await expect(customInput).toHaveValue('Distributed Systems');
  });

  test('3. Sticky bottom bar never covers the last field + overflow/touch targets at 320/360/390/1440', async ({ page, context }) => {
    await applyCookies(context);

    for (const width of [320, 360, 390, 1440]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto('/onboarding');
      await page.waitForSelector('h1:has-text("What are you building first?")');

      // Zero horizontal overflow
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasOverflow, `Overflow on /onboarding at ${width}px`).toBe(false);

      // Focus the last interactive control on Step 0 and verify it sits above the sticky bar
      if (width === 320 || width === 390 || width === 1440) {
        const lastPurposeBtn = page.locator('section[aria-labelledby="section-03-heading"] button').last();
        await lastPurposeBtn.scrollIntoViewIfNeeded();
        await lastPurposeBtn.focus();
        const btnBox = await lastPurposeBtn.boundingBox();
        const barBox = await page.locator('[data-testid="onboarding-sticky-bar"]').boundingBox();
        expect(btnBox).not.toBeNull();
        expect(barBox).not.toBeNull();
        expect(
          btnBox!.y + btnBox!.height,
          `Last field at ${width}px must sit above sticky bar`
        ).toBeLessThanOrEqual(barBox!.y + 1);
      }

      // Touch targets >= 44px on primary controls
      const barBtnBox = await page.locator('[data-testid="onboarding-sticky-bar"] button').last().boundingBox();
      expect(barBtnBox!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('4. Full wizard run saves expected DB rows and captures 1440px & 390px screenshots of every step', async ({ page, context }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/onboarding');

    // Screenshot Step 0 at 1440px & 390px
    await page.screenshot({ path: shotPath('phase8c_step1_1440px.png'), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: shotPath('phase8c_step1_390px.png'), fullPage: false });
    await page.setViewportSize({ width: 1440, height: 900 });

    // Select Other custom specialization
    await page.locator('#spec-select').click();
    await page.locator('#spec-select').fill('Other');
    await page.keyboard.press('Enter');
    await page.locator('input[aria-label="Custom specialization"]').fill('Distributed Systems');

    // Select stage via Combobox
    await page.locator('#career-stage').click();
    await page.locator('#career-stage').fill('Recent');
    await page.keyboard.press('Enter');

    // Advance through all dynamic steps, capturing screenshots
    let stepNum = 2;
    while (true) {
      const continueBtn = page.locator('[data-testid="onboarding-sticky-bar"] button', { hasText: 'Continue to' });
      if ((await continueBtn.count()) === 0) break;
      await continueBtn.click();
      await page.waitForTimeout(200);

      await page.screenshot({ path: shotPath(`phase8c_step${stepNum}_1440px.png`), fullPage: false });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: shotPath(`phase8c_step${stepNum}_390px.png`), fullPage: false });
      await page.setViewportSize({ width: 1440, height: 900 });
      stepNum++;
    }

    // Finish & Open Document
    const finishBtn = page.locator('[data-testid="onboarding-sticky-bar"] button', { hasText: 'Finish & Open Document' });
    await expect(finishBtn).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/editor\/[a-f0-9-]+/, { timeout: 30000 }),
      finishBtn.click(),
    ]);

    const newDocId = page.url().split('/editor/')[1].split('?')[0];

    // Verify exact DB rows saved
    const { data: profileRow } = await adminClient
      .from('master_profiles')
      .select('background_group, specialization')
      .eq('user_id', testUserId)
      .single();
    expect(profileRow.background_group).toBe('engineering_technology');
    expect(profileRow.specialization).toBe('Distributed Systems');

    const { data: docRow } = await adminClient
      .from('documents')
      .select('type, status, template_id')
      .eq('id', newDocId)
      .single();
    expect(docRow.type).toBe('resume');
    expect(docRow.status).toBe('draft');
  });
});
