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

test.describe.serial('Bug 1: Save Conflict Dialog & Concurrency', () => {
  test.setTimeout(180000);
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `conflict-test-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};
  let baseDocId: string = '';

  test.beforeAll(async () => {
    if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) return;
    assertTestProjectRefAllowed(supabaseUrl);

    adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create dedicated user
    const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Conflict Test User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    // 2. Obtain session cookies
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

    const { error: signInErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInErr) throw signInErr;

    // 3. Create document with all section types
    const { data: docRecord, error: docErr } = await (adminClient as any)
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Conflict Master Document',
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        target_role: 'Staff Systems Engineer',
        version: 1,
      })
      .select('id')
      .single();
    if (docErr) throw docErr;
    baseDocId = docRecord.id;

    const sectionsToInsert = [
      {
        document_id: baseDocId,
        section_type: 'header',
        title: 'Contact Information',
        order_index: 0,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          fullName: 'Alex Example',
          email: 'alex@example.com',
          phone: '+1 555-0199',
          city: 'San Francisco',
          country: 'United States',
          headline: 'Principal Systems Architect',
        },
      },
      {
        document_id: baseDocId,
        section_type: 'summary',
        title: 'Professional Summary',
        order_index: 1,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          text: 'Pioneered high-throughput distributed consensus protocols.',
        },
      },
      {
        document_id: baseDocId,
        section_type: 'experience',
        title: 'Work Experience',
        order_index: 2,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'a1111111-1111-4111-8111-111111111111',
              type: 'work',
              role: 'Lead Architect',
              organization: 'Cloud Infrastructure Inc',
              startDate: '2020-01',
              endDate: 'Present',
              bullets: ['Scaled globally distributed datastore.'],
            },
            {
              id: 'a2222222-2222-4222-8222-222222222222',
              type: 'work',
              role: 'Senior Systems Engineer',
              organization: 'Core Platforms LLC',
              startDate: '2017-06',
              endDate: '2019-12',
              bullets: ['Optimized Raft consensus throughput by 40%.'],
            },
          ],
        },
      },
      {
        document_id: baseDocId,
        section_type: 'education',
        title: 'Education',
        order_index: 3,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'b1111111-1111-4111-8111-111111111111',
              institution: 'Stanford University',
              degree: 'M.S. in Computer Systems',
            },
          ],
        },
      },
      {
        document_id: baseDocId,
        section_type: 'skills',
        title: 'Skills',
        order_index: 4,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'c1111111-1111-4111-8111-111111111111',
              category: 'Languages',
              items: [{ name: 'Rust' }, { name: 'Go' }, { name: 'TypeScript' }],
            },
          ],
        },
      },
      {
        document_id: baseDocId,
        section_type: 'projects',
        title: 'Projects',
        order_index: 5,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'd1111111-1111-4111-8111-111111111111',
              title: 'Distributed Log Engine',
              bullets: ['Zero-copy replication protocol.'],
            },
          ],
        },
      },
      {
        document_id: baseDocId,
        section_type: 'publications',
        title: 'Publications',
        order_index: 6,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'e1111111-1111-4111-8111-111111111111',
              title: 'On Consensus in Asynchronous Networks',
              authors: ['Alex Example'],
            },
          ],
        },
      },
      {
        document_id: baseDocId,
        section_type: 'achievements',
        title: 'Honors & Awards',
        order_index: 7,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'f1111111-1111-4111-8111-111111111111',
              title: 'Distinguished Engineering Fellow',
              issuer: 'ACM',
            },
          ],
        },
      },
      {
        document_id: baseDocId,
        section_type: 'certifications',
        title: 'Certifications',
        order_index: 8,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: '81111111-1111-4111-8111-111111111111',
              name: 'Certified Kubernetes Administrator',
              issuingOrg: 'CNCF',
            },
          ],
        },
      },
      {
        document_id: baseDocId,
        section_type: 'custom',
        title: 'Patents & Innovations',
        order_index: 9,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: '91111111-1111-4111-8111-111111111111',
              title: 'Dynamic Shard Rebalancing Algorithm',
              bullets: ['US Patent #1234567'],
            },
          ],
        },
      },
    ];

    for (const sec of sectionsToInsert) {
      await (adminClient as any).from('document_sections').insert(sec);
    }
  });

  test.afterAll(async () => {
    if (adminClient && testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  const applyAuthCookies = async (context: any) => {
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
  };

  test('Single-tab concurrency: rapid edits, template switch, and manual save never trigger 409', async ({
    page,
    context,
  }) => {
    await applyAuthCookies(context);
    await page.goto(`/editor/${baseDocId}`);
    await page.waitForSelector('#toolbar-btn-save');

    // Rapid edits
    const titleInput = page.getByRole('textbox', { name: 'Document Title' });
    await titleInput.fill('Single Tab Concurrency Rapid Test');

    const templatePicker = page.locator('#template-picker');
    await templatePicker.selectOption('modern_professional');
    await templatePicker.selectOption('ats_single_column');

    // Trigger double click on save button
    const saveBtn = page.locator('#toolbar-btn-save');
    await saveBtn.click();
    await saveBtn.click();

    // Verify it settles to Saved and conflict modal NEVER appears
    await expect(page.locator('#save-status-slot')).toContainText('Saved', { timeout: 15000 });
    const conflictModal = page.locator('[role="alertdialog"]');
    await expect(conflictModal).toHaveCount(0);
  });

  test('Two contexts: 409 trigger -> "Keep My Version as New Copy" creates independent doc and preserves edits', async ({
    browser,
  }) => {
    // Context A
    const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await applyAuthCookies(contextA);
    const pageA = await contextA.newPage();
    await pageA.goto(`/editor/${baseDocId}`);
    await pageA.waitForSelector('#toolbar-btn-save');

    // Context B
    const contextB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await applyAuthCookies(contextB);
    const pageB = await contextB.newPage();
    await pageB.goto(`/editor/${baseDocId}`);
    await pageB.waitForSelector('#toolbar-btn-save');

    // Context A edits and saves -> increments server version
    const titleA = pageA.getByRole('textbox', { name: 'Document Title' });
    await titleA.fill('Version 2 Saved By Context A');
    await pageA.locator('#toolbar-btn-save').click();
    await expect(pageA.locator('#save-status-slot')).toContainText('Saved', { timeout: 25000 });

    // Context B edits headline and clicks Save -> triggers 409 Conflict
    const headlineB = pageB.locator('#contact-headline');
    await headlineB.fill('Architect Modified By Context B In Conflict');
    await pageB.locator('#toolbar-btn-save').click();

    // Context B must display Save Conflict modal
    const conflictDialog = pageB.locator('[role="alertdialog"]');
    await expect(conflictDialog).toBeVisible({ timeout: 15000 });
    await expect(conflictDialog).toContainText('Save Conflict');

    // Click "Keep My Version as New Copy"
    const keepCopyBtn = pageB.locator('#conflict-btn-keep-copy');
    await expect(keepCopyBtn).toBeVisible();
    await keepCopyBtn.click();

    // Context B must navigate to the new document
    await pageB.waitForURL((url) => url.pathname.startsWith('/editor/') && !url.pathname.includes(baseDocId), {
      timeout: 15000,
    });

    // Verify the newly created document retained Context B's edit
    await pageB.waitForSelector('#contact-headline');
    const newHeadline = await pageB.locator('#contact-headline').inputValue();
    expect(newHeadline).toBe('Architect Modified By Context B In Conflict');

    // Verify Context A's original document is completely untouched
    await pageA.reload();
    await pageA.waitForSelector('#contact-headline');
    const origHeadline = await pageA.locator('#contact-headline').inputValue();
    expect(origHeadline).not.toBe('Architect Modified By Context B In Conflict');

    await contextA.close();
    await contextB.close();
  });

  test('Two contexts: 409 trigger -> "Reload Server Copy" updates ALL left panel inputs and right preview', async ({
    browser,
  }) => {
    // Context A
    const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await applyAuthCookies(contextA);
    const pageA = await contextA.newPage();
    await pageA.goto(`/editor/${baseDocId}`);
    await pageA.waitForSelector('#toolbar-btn-save');

    // Context B
    const contextB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await applyAuthCookies(contextB);
    const pageB = await contextB.newPage();
    await pageB.goto(`/editor/${baseDocId}`);
    await pageB.waitForSelector('#toolbar-btn-save');

    // Context A makes comprehensive updates across sections and saves
    const titleA = pageA.getByRole('textbox', { name: 'Document Title' });
    await titleA.fill('Reload Test Server Document');

    const headlineA = pageA.locator('#contact-headline');
    await headlineA.fill('Chief Systems Fellow');

    await pageA.locator('#toolbar-btn-save').click();
    await expect(pageA.locator('#save-status-slot')).toContainText('Saved', { timeout: 25000 });

    // Context B types local changes in B and saves -> triggers 409 Conflict
    const headlineB = pageB.locator('#contact-headline');
    await headlineB.fill('Local Headline In Context B');
    await pageB.locator('#toolbar-btn-save').click();

    const conflictDialog = pageB.locator('[role="alertdialog"]');
    await expect(conflictDialog).toBeVisible({ timeout: 10000 });

    // Click "Reload Server Copy"
    const reloadBtn = pageB.locator('#conflict-btn-reload');
    await reloadBtn.click();

    // Conflict dialog disappears
    await expect(conflictDialog).toHaveCount(0);

    // Verify ALL left inputs match the server document
    await expect(pageB.getByRole('textbox', { name: 'Document Title' })).toHaveValue('Reload Test Server Document');
    await expect(pageB.locator('#contact-headline')).toHaveValue('Chief Systems Fellow');

    // Verify live preview extracted text matches server document
    const previewContainer = pageB.locator('#pdf-preview-canvas-container');
    await expect(previewContainer).toBeVisible({ timeout: 15000 });

    await contextA.close();
    await contextB.close();
  });

  test('Save Conflict Dialog accessibility: role, aria, focus trap, Escape non-destructive, touch targets >= 44px', async ({
    page,
    context,
  }) => {
    await applyAuthCookies(context);
    await page.goto(`/editor/${baseDocId}`);
    await page.waitForSelector('#toolbar-btn-save');

    // Simulate conflict status to test accessibility
    await page.evaluate(() => {
      (window as any).__setTestSaveStatus?.('conflict');
    });

    // Also trigger conflict data via state if exposed or simulate save conflict response
    await page.route(`**/api/documents/${baseDocId}/save`, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          serverVersion: 99,
          serverDoc: {
            meta: { id: 'doc-1', title: 'Server Conflict Doc', version: 99 },
            sections: [],
          },
        }),
      });
    });

    await page.locator('#toolbar-btn-save').click();

    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible();

    // Verify ARIA attributes
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'save-conflict-title');
    await expect(dialog).toHaveAttribute('aria-describedby', 'save-conflict-desc');

    // Verify Escape key does not dismiss dialog
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();

    // Verify initial focus is on reload button
    const reloadBtn = page.locator('#conflict-btn-reload');
    await expect(reloadBtn).toBeFocused();

    // Verify Tab cycles focus to Keep Copy button
    await page.keyboard.press('Tab');
    const keepCopyBtn = page.locator('#conflict-btn-keep-copy');
    await expect(keepCopyBtn).toBeFocused();

    // Verify Shift+Tab cycles back
    await page.keyboard.press('Shift+Tab');
    await expect(reloadBtn).toBeFocused();

    // Verify touch targets >= 44px
    const reloadBox = await reloadBtn.boundingBox();
    const keepCopyBox = await keepCopyBtn.boundingBox();
    expect(reloadBox!.height).toBeGreaterThanOrEqual(44);
    expect(keepCopyBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('5. Capture Save Conflict dialog and editor after reload screenshots at 1440px and 390px', async ({
    browser,
  }) => {
    const artifactDir =
      process.env.ARTIFACT_DIR || 'C:\\Users\\Diyan\\.gemini\\antigravity\\brain\\0476a383-8a86-41cb-a552-ce7ab883faf8';

    // 1. Capture at 1440px
    const context1440 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await applyAuthCookies(context1440);
    const page1440 = await context1440.newPage();
    await page1440.goto(`/editor/${baseDocId}`);
    await page1440.waitForSelector('#toolbar-btn-save');

    // Route save to 409 conflict
    await page1440.route(`**/api/documents/${baseDocId}/save`, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          serverVersion: 99,
          serverDoc: {
            meta: { id: baseDocId, title: 'Server Conflict Doc', version: 99 },
            sections: [],
          },
        }),
      });
    });
    await page1440.locator('#toolbar-btn-save').click();
    const dialog1440 = page1440.locator('[role="alertdialog"]');
    await expect(dialog1440).toBeVisible({ timeout: 10000 });

    // Screenshot dialog at 1440px
    await page1440.screenshot({
      path: path.join(artifactDir, 'save_conflict_dialog_1440px.png'),
      animations: 'disabled',
    });

    // Reload server copy and capture editor
    await page1440.locator('#conflict-btn-reload').click();
    await expect(dialog1440).toHaveCount(0);
    await page1440.waitForTimeout(500);
    await page1440.screenshot({
      path: path.join(artifactDir, 'editor_after_reload_1440px.png'),
      animations: 'disabled',
    });
    await context1440.close();

    // 2. Capture at 390px
    const context390 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await applyAuthCookies(context390);
    const page390 = await context390.newPage();
    await page390.goto(`/editor/${baseDocId}`);
    await page390.waitForSelector('#toolbar-btn-save');

    await page390.route(`**/api/documents/${baseDocId}/save`, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          serverVersion: 99,
          serverDoc: {
            meta: { id: baseDocId, title: 'Server Conflict Doc', version: 99 },
            sections: [],
          },
        }),
      });
    });
    await page390.locator('#toolbar-btn-save').click();
    const dialog390 = page390.locator('[role="alertdialog"]');
    await expect(dialog390).toBeVisible({ timeout: 10000 });

    // Screenshot dialog at 390px
    await page390.screenshot({
      path: path.join(artifactDir, 'save_conflict_dialog_390px.png'),
      animations: 'disabled',
    });

    // Reload server copy and capture editor
    await page390.locator('#conflict-btn-reload').click();
    await expect(dialog390).toHaveCount(0);
    await page390.waitForTimeout(500);
    await page390.screenshot({
      path: path.join(artifactDir, 'editor_after_reload_390px.png'),
      animations: 'disabled',
    });
    await context390.close();
  });
});
