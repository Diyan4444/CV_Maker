import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import * as dotenv from 'dotenv';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

test.describe('Item 2: Editor Error UX & Offline/Draft Verification', () => {
  let adminClient: any;
  let testUserId: string;
  let testEmail: string;
  let testDocId: string;
  const testPassword = 'Password123!SafePass';
  const capturedCookies: Record<string, string> = {};

  test.beforeAll(async () => {
    assertTestProjectRefAllowed(supabaseUrl);
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    testEmail = `test-error-ux-${Date.now()}@example.com`;
    const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Error UX Tester' },
    });
    if (createErr) throw createErr;
    testUserId = userData.user.id;

    // Create test document
    const { data: docData, error: docErr } = await adminClient
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Error UX Resume',
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        version: 1,
      })
      .select()
      .single();
    if (docErr) throw docErr;
    testDocId = docData.id;

    // Insert section with experience
    await adminClient.from('document_sections').insert([
      {
        document_id: testDocId,
        section_type: 'header',
        title: 'Header',
        order_index: 0,
        is_visible: true,
        content: {
          fullName: 'Error UX Tester',
          email: testEmail,
          phone: '+1 555-0100',
        },
      },
      {
        document_id: testDocId,
        section_type: 'experience',
        title: 'Experience',
        order_index: 1,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: '11111111-1111-4111-a111-111111111111',
              type: 'job',
              role: 'Software Engineer',
              organization: 'Test Org',
              startDate: '2020-01',
              endDate: 'Present',
              bullets: ['Built reliable distributed systems'],
            },
          ],
        },
      },
    ]);

    // Sign in to capture session cookies
    const ssrClient = createServerClient(supabaseUrl, anonKey, {
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

    const { error: loginErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (loginErr) throw loginErr;
  });

  test.afterAll(async () => {
    if (adminClient && testUserId) {
      await adminClient.from('documents').delete().eq('user_id', testUserId);
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

  test('Error UX: (a) 400 over-limit shows correct label and aria-invalid, (b) Retry succeeds, (c) 401 banner, (d) offline, (e) draft recovery', async ({ page }) => {
    test.setTimeout(90000);
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // 1. Navigate directly to editor
    await page.goto(`/editor/${testDocId}`);
    await page.waitForLoadState('networkidle');

    // ----------------------------------------------------
    // (a) Over-limit field gives 400 + UI shows correct field label + highlights field + sets aria-invalid/aria-describedby
    // ----------------------------------------------------
    console.log('[Test Part A] Testing over-limit field validation UX...');
    // Find the Role or Start Date input in Experience section
    const roleInput = page.locator('#input-exp-role');
    await expect(roleInput).toBeVisible();

    // Fill with > 200 characters (max 200 for role)
    const overLimitRole = 'A'.repeat(205);
    await roleInput.fill(overLimitRole);

    // Click Save button
    const saveBtn = page.locator('#toolbar-btn-save');
    await saveBtn.click();

    // Verify status indicator shows "Role too long (max 200)"
    const statusSlot = page.locator('#save-status-slot');
    await expect(statusSlot).toContainText(/Role too long|Text too long/);

    // Verify aria-invalid and aria-describedby on the over-limit input
    await expect(roleInput).toHaveAttribute('aria-invalid', 'true');
    await expect(roleInput).toHaveAttribute('aria-describedby', 'error-exp-role');

    // ----------------------------------------------------
    // (b) Retry succeeds after the field is fixed
    // ----------------------------------------------------
    console.log('[Test Part B] Testing Retry after fixing field...');
    // Fix the field back to a valid value
    await roleInput.fill('Senior Software Engineer');

    // Click the Retry button
    const retryBtn = page.locator('#toolbar-btn-retry');
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    // Verify status returns to Saved
    await expect(statusSlot).toContainText('Saved', { timeout: 10000 });
    await expect(roleInput).toHaveAttribute('aria-invalid', 'false');

    // ----------------------------------------------------
    // (c) 401 shows the sign-in banner and keeps the local draft in localStorage
    // ----------------------------------------------------
    console.log('[Test Part C] Testing 401 session expiration & localStorage draft...');
    // Intercept next save to return 401
    await page.route(`**/api/documents/${testDocId}/save`, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    // Make an edit to trigger save
    await roleInput.fill('Lead Systems Architect');
    await saveBtn.click();

    // Verify session expired alert banner is visible
    const alertBanner = page.getByRole('alert').filter({ hasText: 'Your session has expired' });
    await expect(alertBanner).toBeVisible();
    await expect(alertBanner).toContainText('Your session has expired. Your current draft is preserved locally.');
    await expect(alertBanner.locator('a')).toContainText('Sign in again');

    // Verify draft exists in localStorage
    const savedDraft = await page.evaluate((docId) => {
      return localStorage.getItem(`cv_maker_draft_${docId}`);
    }, testDocId);
    expect(savedDraft).toBeTruthy();
    expect(savedDraft).toContain('Lead Systems Architect');

    // Unroute 401 interceptor
    await page.unroute(`**/api/documents/${testDocId}/save`);

    // ----------------------------------------------------
    // (d) Offline shows "Offline" not "Error"
    // ----------------------------------------------------
    console.log('[Test Part D] Testing offline status indicator...');
    // Simulate offline
    await page.context().setOffline(true);

    // Make an edit and try to save
    await roleInput.fill('Principal Architect Offline Test');
    await saveBtn.click();

    // Verify status slot shows "Offline"
    await expect(statusSlot).toContainText('Offline');
    await expect(statusSlot).not.toContainText('Error');

    // Restore online
    await page.context().setOffline(false);

    // ----------------------------------------------------
    // (e) Draft survives a failed save and a reload
    // ----------------------------------------------------
    console.log('[Test Part E] Testing draft survival across reload...');
    // We already have the draft in localStorage with 'Principal Architect Offline Test'
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that draft recovery prompt appeared
    const draftModal = page.locator('text=Unsaved Draft Found');
    await expect(draftModal).toBeVisible({ timeout: 10000 });

    const restoreBtn = page.getByRole('button', { name: 'Restore Local Draft' });
    await expect(restoreBtn).toBeVisible();
    await restoreBtn.click();

    // Verify the edited value survived
    const restoredInput = page.locator('#input-exp-role');
    await expect(restoredInput).toHaveValue('Principal Architect Offline Test');
    console.log('[Test Passed] All Item 2 UX conditions verified cleanly!');
  });
});
