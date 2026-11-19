import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe.serial('Document Engine & Editor Lifecycle', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `editor-test-${Date.now()}@folioone.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};
  let createdDocId: string = '';

  test.beforeAll(async () => {
    if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) return;

    adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Dr. Jane Editor User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    // Seed master profile with facts to clone
    const { data: profileRecord, error: profErr } = await (adminClient as any)
      .from('master_profiles')
      .insert({
        user_id: testUserId,
        background_group: 'Engineering and Technology',
        specialization: 'Computer Science Engineering',
        headline: 'Staff Distributed Systems Engineer',
        summary: 'Expert in cloud-native fault-tolerant architectures and kernel debugging.',
      })
      .select('id')
      .single();
    if (profErr) throw profErr;

    // Add experience entry
    await (adminClient as any).from('experience').insert({
      master_profile_id: profileRecord.id,
      title: 'Principal Systems Architect',
      company: 'Distributed Systems Corp',
      location: 'Bengaluru, India',
      start_date: '2021-01',
      is_current: true,
      bullets: [
        'Designed high-throughput Raft consensus layer handling 10M ops/sec.',
        'Mentored engineering teams across latency optimization and observability.',
      ],
      technologies: ['Rust', 'Go', 'Kubernetes'],
    });

    // Add education entry
    await (adminClient as any).from('education').insert({
      master_profile_id: profileRecord.id,
      institution: 'Indian Institute of Technology Madras',
      degree: 'B.Tech in Computer Science',
      field_of_study: 'Distributed Computing',
      start_date: '2015-08',
      end_date: '2019-05',
      grade: '9.4 CGPA',
    });

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

    const { error: loginErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (loginErr) throw loginErr;
  });

  test.afterAll(async () => {
    if (adminClient && testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  test.beforeEach(async ({ page }) => {
    if (Object.keys(capturedCookies).length > 0) {
      await page.context().addCookies(
        Object.entries(capturedCookies).map(([name, value]) => ({
          name,
          value,
          domain: 'localhost',
          path: '/',
        }))
      );
    }
  });

  test('1. Dashboard shows empty state and document creator modal opens', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Document count badge shows 0 / 20 documents used
    const countBadge = page.getByText(/20 documents used/);
    await expect(countBadge).toBeVisible();

    // Click "+ New Document"
    const newDocBtn = page.getByRole('button', { name: /New Document/i });
    await expect(newDocBtn).toBeVisible();
    await newDocBtn.click();

    // Modal appears
    await expect(page.getByRole('heading', { name: /Create New Document/i })).toBeVisible();

    // Fill modal fields
    await page.fill('#doc-title', 'Staff Systems Resume 2026');
    await page.fill('#target-role', 'Principal Infrastructure Architect');

    // Submit creation
    const submitBtn = page.getByRole('button', { name: /Create & Open/i });
    await submitBtn.click();

    // Should navigate to /editor/[documentId]
    await page.waitForURL(/\/editor\/[a-f0-9-]+/, { timeout: 30000 });
    const url = page.url();
    createdDocId = url.split('/editor/')[1].split('?')[0];
    expect(createdDocId).toBeTruthy();
  });

  test('2. Editor loads independent copy, displays sections, and renders live PDF preview', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('networkidle');

    // Check header and independent copy banner
    await expect(page.getByText('Independent Document Copy', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Document Title')).toHaveValue('Staff Systems Resume 2026');

    // Check sections exist
    await expect(page.locator('input[value="Header & Contact Information"]')).toBeVisible();
    await expect(page.locator('input[value="Professional Summary"]')).toBeVisible();
    await expect(page.locator('input[value="Experience"]')).toBeVisible();
    await expect(page.locator('input[value="Education"]')).toBeVisible();

    // Check preview canvas rendered
    const previewCanvas = page.locator('canvas').first();
    await expect(previewCanvas).toBeVisible({ timeout: 10000 });
  });

  test('3. Editing input triggers unsaved state and debounced autosave completes', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('networkidle');

    // Change target role
    const targetRoleInput = page.getByLabel('Target Role');
    await targetRoleInput.fill('VP of Cloud Infrastructure');

    // Should show "Unsaved changes"
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    // Wait for debounced autosave (~1.5s debounce + server save) to finish
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15000 });

    // Refresh page and verify value persisted
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Target Role')).toHaveValue('VP of Cloud Infrastructure', { timeout: 10000 });
  });

  test('4. Section manipulation: visibility toggle, template change, and keyboard save', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('networkidle');

    // Toggle visibility of summary section
    const hideBtn = page.getByRole('button', { name: /^Hide / }).first();
    if (await hideBtn.isVisible()) {
      await hideBtn.click();
      await expect(page.locator('text=Unsaved changes')).toBeVisible();
    }

    // Switch template to Modern Professional
    const templateSelect = page.locator('#template-picker');
    await templateSelect.selectOption('modern_professional');
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    // Press Ctrl+S / Cmd+S
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+S' : 'Control+S');

    // Saved indicator should be visible
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15000 });

    // Switch template to Academic CV
    await templateSelect.selectOption('academic_cv');
    await page.keyboard.press(isMac ? 'Meta+S' : 'Control+S');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('5. Mobile 390px view: Tab switching between Editor and Live Preview', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('networkidle');

    // Check mobile tab buttons
    const editTabBtn = page.getByRole('button', { name: /Edit Sections/i });
    const previewTabBtn = page.getByRole('button', { name: /Live A4 Preview/i });

    await expect(editTabBtn).toBeVisible();
    await expect(previewTabBtn).toBeVisible();

    // Click Live Preview tab
    await previewTabBtn.click();

    // Canvas container should be visible
    const previewCanvas = page.locator('canvas').first();
    await expect(previewCanvas).toBeVisible({ timeout: 10000 });

    // Click Edit Document tab
    await editTabBtn.click();
    await expect(page.locator('input[value="Header & Contact Information"]')).toBeVisible();
  });

  test('6. Dev gallery (/dev/templates) allows switching fixtures and templates', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dev/templates');
    await page.waitForLoadState('networkidle');

    // Header and fixture buttons visible
    await expect(page.getByRole('heading', { name: /Dev Template & Stress Gallery/i })).toBeVisible();

    // Switch to 2-Page Resume
    const twoPageBtn = page.getByRole('button', { name: /2-Page Senior Engineer Resume/i });
    await expect(twoPageBtn).toBeVisible();
    await twoPageBtn.click();

    // Switch to 3-Page Academic CV
    const threePageBtn = page.getByRole('button', { name: /3-Page Academic Scholarly CV/i });
    await expect(threePageBtn).toBeVisible();
    await threePageBtn.click();

    // Switch to Extreme Edge Case
    const extremeBtn = page.getByRole('button', { name: /Extreme Edge Case/i });
    await expect(extremeBtn).toBeVisible();
    await extremeBtn.click();

    // Verify canvas rendered
    const previewCanvas = page.locator('canvas').first();
    await expect(previewCanvas).toBeVisible({ timeout: 10000 });
  });

  test('7. Local draft recovery prompt appears when unsaved changes exist in storage', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('networkidle');

    // Inject draft with different title into localStorage
    await page.evaluate((docId) => {
      const draft = {
        meta: {
          id: docId,
          title: 'Unsaved Draft Title After Crash',
          templateId: 'ats_single_column',
          accentColor: '#0B0B0B',
          targetRole: 'Recovered Role',
          version: 1,
        },
        sections: [],
      };
      localStorage.setItem(`cv_maker_draft_${docId}`, JSON.stringify(draft));
    }, createdDocId);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Prompt modal should appear
    await expect(page.getByText('Unsaved Draft Found')).toBeVisible({ timeout: 10000 });

    // Click "Discard & Use Server Copy"
    const discardBtn = page.getByRole('button', { name: /Discard/i });
    await expect(discardBtn).toBeVisible();
    await discardBtn.click();

    // Modal dismissed
    await expect(page.getByText('Unsaved Draft Found')).not.toBeVisible();
  });
});
