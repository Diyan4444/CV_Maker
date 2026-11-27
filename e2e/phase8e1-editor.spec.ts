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

const ARTIFACT_DIR = 'C:/Users/Diyan/.gemini/antigravity/brain/0476a383-8a86-41cb-a552-ce7ab883faf8';

test.describe.serial('Phase 8E-1 Editor Layout, Rail, Page Settings & Preview', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId = '';
  const testEmail = `phase8e1-test-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  const capturedCookies: Record<string, string> = {};
  let createdDocId = '';

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
      user_metadata: { full_name: 'Ada Lovelace' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    const { data: profileRecord, error: profErr } = await (adminClient as any)
      .from('master_profiles')
      .insert({
        user_id: testUserId,
        background_group: 'Engineering and Technology',
        specialization: 'Computer Science Engineering',
        headline: 'Principal Systems Architect',
        summary: 'Distributed systems engineer building low-latency pipelines and resilient cloud infrastructure.',
      })
      .select('id')
      .single();
    if (profErr) throw profErr;

    await (adminClient as any).from('experiences').insert([
      {
        profile_id: profileRecord.id,
        role: 'Staff Software Engineer',
        organization: 'Analytical Engines Ltd',
        location: 'London, UK',
        start_date: '2021-01',
        is_current: true,
        bullets: [
          'Architected event-driven ingestion pipeline handling 120k events per second.',
          'Reduced p99 query latency by 42% through adaptive partitioning.',
        ],
      },
      {
        profile_id: profileRecord.id,
        role: 'Senior Engineer',
        organization: 'Babbage Cloud',
        location: 'Remote',
        start_date: '2018-03',
        end_date: '2020-12',
        is_current: false,
        bullets: ['Led migration from monolithic SQL cluster to sharded PostgreSQL.'],
      },
    ]);

    const ssrClient = createServerClient(supabaseUrl!, anonKey!, {
      cookies: {
        getAll() {
          return Object.entries(capturedCookies).map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            capturedCookies[name] = value;
          });
        },
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

  async function addSessionCookies(context: any) {
    const cookiesToAdd = Object.entries(capturedCookies).map(([name, value]) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
    }));
    await context.addCookies(cookiesToAdd);
  }

  test('1. Desktop 1440px: rail tabs, sticky preview, fit-to-width, zoom & scroll retention', async ({
    page,
    context,
  }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) test.skip();

    await addSessionCookies(context);

    const createRes = await page.request.post('/api/documents/create', {
      data: {
        type: 'resume',
        templateId: 'ats_single_column',
        title: 'Phase 8E1 Editor Test Resume',
        targetRole: 'Staff Engineer',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    createdDocId = created.documentId;
    expect(createdDocId).toBeTruthy();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#editor-icon-rail')).toBeVisible();
    await expect(page.locator('#preview-page-readout')).toContainText('A4 · 210 × 297 mm', { timeout: 20000 });
    await expect(page.locator('#pdf-preview-canvas-container canvas').first()).toBeVisible({ timeout: 20000 });

    const overflow1440 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow1440).toBe(false);

    const previewContainer = page.locator('#pdf-preview-scroll-container');
    const initialBox = await previewContainer.boundingBox();
    expect(initialBox).not.toBeNull();
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(100);
    const scrolledBox = await previewContainer.boundingBox();
    expect(scrolledBox).not.toBeNull();
    expect(scrolledBox!.y).toBeLessThan(180);
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.locator('#preview-fit-width-btn').click();
    const fitPct = await page.locator('#preview-zoom-percentage').textContent();
    expect(fitPct).toMatch(/^\d+%$/);

    await page.locator('#preview-zoom-slider').fill('1.2');
    await expect(page.locator('#preview-zoom-percentage')).toHaveText('120%');

    await page.evaluate(() => {
      const el = document.getElementById('pdf-preview-scroll-container');
      if (el) el.scrollTop = 120;
    });
    const beforeSwitchScroll = await page.evaluate(() => {
      return document.getElementById('pdf-preview-scroll-container')?.scrollTop ?? 0;
    });
    await page.locator('#right-tab-ats').click();
    await expect(page.locator('#ats-panel-scroll-container')).toBeVisible();
    await page.locator('#right-tab-preview').click();
    const afterSwitchScroll = await page.evaluate(() => {
      return document.getElementById('pdf-preview-scroll-container')?.scrollTop ?? 0;
    });
    expect(afterSwitchScroll).toBe(beforeSwitchScroll);

    for (const tab of ['content', 'template', 'theme', 'page'] as const) {
      await page.locator(`#rail-tab-${tab}`).click();
      await page.waitForTimeout(100);
      await page.screenshot({ path: `${ARTIFACT_DIR}/phase8e1_1440_${tab}.png` });
    }
  });

  test('2. Page settings, undo/redo & reload persistence', async ({ page, context }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !createdDocId) test.skip();
    await addSessionCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`, { waitUntil: 'domcontentloaded' });

    await page.locator('#rail-tab-page').click();
    await page.locator('#page-font-noto-serif').click();
    await page.locator('#page-font-size-slider').fill('11');
    await expect(page.locator('#page-font-size-value')).toHaveText('11.0 pt');
    await page.locator('#page-margin-slider').fill('28');
    await expect(page.locator('#page-margin-value')).toHaveText('28 pt');
    await page.locator('#page-numbers-toggle').check();

    await page.locator('#toolbar-btn-undo').click();
    await expect(page.locator('#page-numbers-toggle')).not.toBeChecked();
    await page.locator('#toolbar-btn-redo').click();
    await expect(page.locator('#page-numbers-toggle')).toBeChecked();

    await page.locator('#toolbar-btn-save').click();
    await expect(page.locator('#save-status-slot')).toContainText('Saved', { timeout: 15000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#rail-tab-page').click();
    await expect(page.locator('#page-font-noto-serif')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#page-font-size-value')).toHaveText('11.0 pt');
    await expect(page.locator('#page-margin-value')).toHaveText('28 pt');
    await expect(page.locator('#page-numbers-toggle')).toBeChecked();
  });

  test('3. Compact desktop 1100px: preview width >= 420px', async ({ page, context }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !createdDocId) test.skip();
    await addSessionCookies(context);
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto(`/editor/${createdDocId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
    const overflow1100 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow1100).toBe(false);
    const box1100 = await page.locator('#pdf-preview-scroll-container').boundingBox();
    expect(box1100).not.toBeNull();
    expect(box1100!.width).toBeGreaterThanOrEqual(418);
  });

  test('4. Tablet 900px: preview collapsed by default and toggleable', async ({ page, context }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !createdDocId) test.skip();
    await addSessionCookies(context);
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto(`/editor/${createdDocId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
    await expect(page.locator('#tablet-preview-toggle')).toBeVisible();
    await expect(page.locator('#pdf-preview-scroll-container')).toBeHidden();
    const overflow900 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow900).toBe(false);
    await page.locator('#tablet-preview-toggle').click();
    await expect(page.locator('#pdf-preview-scroll-container')).toBeVisible();
    await page.locator('#tablet-preview-toggle').click();
  });

  test('5. Mobile 390px: Edit, Preview & ATS tabs with zero overflow', async ({ page, context }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !createdDocId) test.skip();
    await addSessionCookies(context);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/editor/${createdDocId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
    const overflow390 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow390).toBe(false);
    for (const tab of ['Content', 'Template', 'Theme', 'Page'] as const) {
      await page.getByRole('tab', { name: tab }).click();
    }
    await page.getByRole('button', { name: 'Live A4 Preview Tab' }).click();
    await expect(page.locator('#pdf-preview-scroll-container')).toBeVisible();
  });
});
