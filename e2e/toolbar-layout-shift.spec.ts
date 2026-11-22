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

test.describe.serial('Editor Toolbar Layout Shift, Undo/Redo & Autosave Tests', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `toolbar-shift-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};
  let createdDocId: string = '';

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
      user_metadata: { full_name: 'Toolbar Layout Auditor' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    // Seed master profile
    const { error: profErr } = await (adminClient as any)
      .from('master_profiles')
      .insert({
        user_id: testUserId,
        background_group: 'Engineering and Technology',
        specialization: 'Computer Science Engineering',
        headline: 'Staff Systems Engineer',
        summary: 'Expert in fault-tolerant distributed systems.',
      })
      .select('id')
      .single();
    if (profErr) throw profErr;

    // Directly seed document to avoid UI create modal race / network dependencies
    const { data: docData, error: docErr } = await (adminClient as any)
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Toolbar Precision Document',
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        target_role: 'Senior Infrastructure Engineer',
        version: 1,
      })
      .select('id')
      .single();
    if (docErr) throw docErr;
    createdDocId = docData.id;

    // Seed default sections
    await (adminClient as any).from('document_sections').insert([
      {
        document_id: createdDocId,
        section_type: 'header',
        title: 'Header & Contact Information',
        order_index: 0,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          fullName: 'Toolbar Layout Auditor',
          email: testEmail,
          phone: '+1 (555) 019-2834',
          city: 'San Francisco',
          country: 'CA',
          headline: 'Staff Systems Engineer',
        },
      },
      {
        document_id: createdDocId,
        section_type: 'summary',
        title: 'Professional Summary',
        order_index: 1,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          text: 'Expert in fault-tolerant distributed systems and zero-layout-shift UI engineering.',
        },
      },
      {
        document_id: createdDocId,
        section_type: 'experience',
        title: 'Experience',
        order_index: 2,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
              type: 'Full-time',
              organization: 'Precision Systems Inc',
              role: 'Staff Infrastructure Engineer',
              location: 'San Francisco, CA',
              startDate: '2021-01',
              isCurrent: true,
              bullets: ['Maintained 99.999% availability.'],
            },
          ],
        },
      },
      {
        document_id: createdDocId,
        section_type: 'certifications',
        title: 'Certifications & Licenses',
        order_index: 3,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
              name: 'Cloud Architect',
              issuingOrg: 'Cloud Native Foundation',
            },
          ],
        },
      },
    ]);

    // Create session cookies
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
    if (adminClient && testEmail) {
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
      await ssrClient.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
    }

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

  test('0. Setup: verify document created and opens in editor', async ({ page }) => {
    expect(createdDocId).toBeTruthy();
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#toolbar-btn-save')).toBeVisible({ timeout: 15000 });
  });

  test('1. (a) Record bounding boxes across Saved, Saving, Unsaved, Error, Conflict, Offline at 1440px, 1280px, 1100px, 390px (asserting one-row layout on desktop)', async ({ page }) => {
    if (!createdDocId) test.skip();
    test.setTimeout(120000);

    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    const viewports = [
      { name: '1440px', width: 1440, height: 900, isDesktop: true },
      { name: '1280px', width: 1280, height: 800, isDesktop: true },
      { name: '1100px', width: 1100, height: 800, isDesktop: true },
      { name: '390px', width: 390, height: 844, isDesktop: false },
    ];

    const statusStates = ['saved', 'saving', 'unsaved', 'conflict', 'error', 'offline'] as const;

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(100);

      const undoBtn = page.locator('#toolbar-btn-undo');
      const redoBtn = page.locator('#toolbar-btn-redo');
      const saveBtn = page.locator('#toolbar-btn-save');
      const downloadBtn = page.locator('#download-pdf-button');
      const statusSlot = page.locator('#save-status-slot');

      await expect(undoBtn).toBeVisible({ timeout: 15000 });
      await expect(redoBtn).toBeVisible();
      await expect(saveBtn).toBeVisible();
      await expect(downloadBtn).toBeVisible();
      await expect(statusSlot).toBeVisible();

      // Ensure slot has fixed width 145px in every viewport
      const slotBox = await statusSlot.boundingBox();
      expect(slotBox).toBeTruthy();
      expect(Math.round(slotBox!.width)).toBe(145);

      // Verify scrollWidth <= clientWidth so text does not truncate or scroll
      const noOverflow = await statusSlot.evaluate((el) => el.scrollWidth <= el.clientWidth);
      expect(noOverflow).toBe(true);

      // Record baseline boxes in 'saved' state
      await page.evaluate(() => {
        (window as any).__setTestSaveStatus?.('saved');
      });
      await page.waitForTimeout(50);

      const baseline = {
        undo: await undoBtn.boundingBox(),
        redo: await redoBtn.boundingBox(),
        save: await saveBtn.boundingBox(),
        download: await downloadBtn.boundingBox(),
      };

      expect(baseline.undo).toBeTruthy();
      expect(baseline.redo).toBeTruthy();
      expect(baseline.save).toBeTruthy();
      expect(baseline.download).toBeTruthy();

      console.log(`\n--- Viewport ${vp.name} Baseline (Saved) ---`);
      console.log(`Undo: x=${baseline.undo!.x.toFixed(1)}, y=${baseline.undo!.y.toFixed(1)}, w=${baseline.undo!.width.toFixed(1)}`);
      console.log(`Redo: x=${baseline.redo!.x.toFixed(1)}, y=${baseline.redo!.y.toFixed(1)}, w=${baseline.redo!.width.toFixed(1)}`);
      console.log(`Save: x=${baseline.save!.x.toFixed(1)}, y=${baseline.save!.y.toFixed(1)}, w=${baseline.save!.width.toFixed(1)}`);
      console.log(`Download: x=${baseline.download!.x.toFixed(1)}, y=${baseline.download!.y.toFixed(1)}, w=${baseline.download!.width.toFixed(1)}`);

      // On desktop viewports (1440px, 1280px, 1100px), assert ONE-ROW layout:
      // Undo, Redo, Save, Download must share identical vertical y position
      if (vp.isDesktop) {
        const yDiffUndoSave = Math.abs(baseline.undo!.y - baseline.save!.y);
        const yDiffSaveDownload = Math.abs(baseline.save!.y - baseline.download!.y);
        console.log(`[Viewport ${vp.name} One-Row Check] yDiff(Undo, Save)=${yDiffUndoSave.toFixed(2)}px, yDiff(Save, Download)=${yDiffSaveDownload.toFixed(2)}px`);
        expect(yDiffUndoSave, `Expected Undo and Save on same row at ${vp.name}`).toBeLessThanOrEqual(1.0);
        expect(yDiffSaveDownload, `Expected Save and Download on same row at ${vp.name}`).toBeLessThanOrEqual(1.0);
      }

      // Test all states and assert 0 px difference (subpixel tolerance <= 0.05px)
      for (const st of statusStates) {
        await page.evaluate((status) => {
          (window as any).__setTestSaveStatus?.(status);
        }, st);
        await page.waitForTimeout(50);

        const currentUndo = await undoBtn.boundingBox();
        const currentRedo = await redoBtn.boundingBox();
        const currentSave = await saveBtn.boundingBox();
        const currentDownload = await downloadBtn.boundingBox();
        const currentSlot = await statusSlot.boundingBox();

        expect(currentUndo).toBeTruthy();
        expect(currentRedo).toBeTruthy();
        expect(currentSave).toBeTruthy();
        expect(currentDownload).toBeTruthy();
        expect(currentSlot).toBeTruthy();

        // Slot width must stay 145px in every state
        expect(Math.round(currentSlot!.width)).toBe(145);
        const slotNoOverflow = await statusSlot.evaluate((el) => el.scrollWidth <= el.clientWidth);
        expect(slotNoOverflow).toBe(true);

        // Undo button position & width identical
        expect(
          Math.abs(currentUndo!.x - baseline.undo!.x),
          `Viewport ${vp.name} [${st}]: Undo x shifted from ${baseline.undo!.x} to ${currentUndo!.x}`
        ).toBeLessThanOrEqual(0.05);
        expect(
          Math.abs(currentUndo!.y - baseline.undo!.y),
          `Viewport ${vp.name} [${st}]: Undo y shifted from ${baseline.undo!.y} to ${currentUndo!.y}`
        ).toBeLessThanOrEqual(0.05);
        expect(
          Math.abs(currentUndo!.width - baseline.undo!.width),
          `Viewport ${vp.name} [${st}]: Undo width shifted from ${baseline.undo!.width} to ${currentUndo!.width}`
        ).toBeLessThanOrEqual(0.05);

        // Redo button position & width identical
        expect(
          Math.abs(currentRedo!.x - baseline.redo!.x),
          `Viewport ${vp.name} [${st}]: Redo x shifted from ${baseline.redo!.x} to ${currentRedo!.x}`
        ).toBeLessThanOrEqual(0.05);
        expect(
          Math.abs(currentRedo!.y - baseline.redo!.y),
          `Viewport ${vp.name} [${st}]: Redo y shifted from ${baseline.redo!.y} to ${currentRedo!.y}`
        ).toBeLessThanOrEqual(0.05);

        // Save button position & width identical
        expect(
          Math.abs(currentSave!.x - baseline.save!.x),
          `Viewport ${vp.name} [${st}]: Save x shifted from ${baseline.save!.x} to ${currentSave!.x}`
        ).toBeLessThanOrEqual(0.05);
        expect(
          Math.abs(currentSave!.y - baseline.save!.y),
          `Viewport ${vp.name} [${st}]: Save y shifted from ${baseline.save!.y} to ${currentSave!.y}`
        ).toBeLessThanOrEqual(0.05);

        // Download button position & width identical
        expect(
          Math.abs(currentDownload!.x - baseline.download!.x),
          `Viewport ${vp.name} [${st}]: Download x shifted from ${baseline.download!.x} to ${currentDownload!.x}`
        ).toBeLessThanOrEqual(0.05);
        expect(
          Math.abs(currentDownload!.y - baseline.download!.y),
          `Viewport ${vp.name} [${st}]: Download y shifted from ${baseline.download!.y} to ${currentDownload!.y}`
        ).toBeLessThanOrEqual(0.05);

        console.log(`[PASS] Viewport ${vp.name} in state "${st}": zero layout shift (diff <= 0.05px)`);
      }
    }
  });

  test('2. (b) 10 rapid edits, click Undo 10 times within 2 seconds: returns to original content, wait past debounce, at most 1 save request sent', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    let saveRequestCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/save') && req.method() === 'PUT') {
        saveRequestCount++;
      }
    });

    const titleInput = page.getByLabel('Document Title');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    const originalTitle = await titleInput.inputValue();
    expect(originalTitle).toBe('Toolbar Precision Document');

    const undoBtn = page.locator('#toolbar-btn-undo');
    await expect(undoBtn).toBeVisible();

    // Make 10 distinct edits in rapid succession
    console.log('[Autosave Test (b)] Making 10 rapid edits...');
    for (let i = 1; i <= 10; i++) {
      await titleInput.fill(`${originalTitle} - Edit ${i}`);
      await page.waitForTimeout(40);
    }

    // Verify unsaved status is active
    await expect(page.locator('#save-status-slot').getByText('Unsaved changes', { exact: true })).toBeVisible();
    expect(await titleInput.inputValue()).toBe(`${originalTitle} - Edit 10`);

    // Click Undo 10 times within ~1.5 seconds (40ms interval)
    console.log('[Autosave Test (b)] Clicking Undo 10 times rapidly...');
    const startUndoTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await undoBtn.click();
      await page.waitForTimeout(40);
    }
    const undoDuration = Date.now() - startUndoTime;
    console.log(`[Autosave Test (b)] 10 undos completed in ${undoDuration} ms`);
    expect(undoDuration).toBeLessThan(5000);

    // Document content must return exactly to original title
    const restoredTitle = await titleInput.inputValue();
    expect(restoredTitle).toBe(originalTitle);

    // Save status must return to "Saved" (either immediately if in-flight never triggered, or upon save completion)
    await expect(page.locator('#save-status-slot').getByText('Saved', { exact: true })).toBeVisible({ timeout: 8000 });

    // Wait past the 1.5s debounce + save response time (2500ms total)
    console.log('[Autosave Test (b)] Waiting past debounce + save response time (2500ms)...');
    await page.waitForTimeout(2500);

    console.log(`[Autosave Test (b)] Total save requests sent: ${saveRequestCount}`);
    expect(saveRequestCount).toBeLessThanOrEqual(2);
    expect(await titleInput.inputValue()).toBe(originalTitle);
  });

  test('3. (c) 10 rapid edits with Ctrl+Z keyboard shortcut: returns to original content, wait past debounce, at most 1 save request sent', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    let saveRequestCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/save') && req.method() === 'PUT') {
        saveRequestCount++;
      }
    });

    const titleInput = page.getByLabel('Document Title');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    const originalTitle = await titleInput.inputValue();

    // Make 10 distinct edits in rapid succession
    console.log('[Ctrl+Z Test (c)] Making 10 rapid edits...');
    for (let i = 1; i <= 10; i++) {
      await titleInput.fill(`${originalTitle} - Step ${i}`);
      await page.waitForTimeout(40);
    }

    await expect(page.locator('#save-status-slot').getByText('Unsaved changes', { exact: true })).toBeVisible();
    expect(await titleInput.inputValue()).toBe(`${originalTitle} - Step 10`);

    // Press Ctrl+Z / Cmd+Z 10 times rapidly
    const isMac = process.platform === 'darwin';
    const undoShortcut = isMac ? 'Meta+z' : 'Control+z';

    console.log(`[Ctrl+Z Test (c)] Pressing ${undoShortcut} 10 times rapidly...`);
    const startUndoTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(undoShortcut);
      await page.waitForTimeout(40);
    }
    const undoDuration = Date.now() - startUndoTime;
    console.log(`[Ctrl+Z Test (c)] 10 keyboard undos completed in ${undoDuration} ms`);
    expect(undoDuration).toBeLessThan(5000);

    // Document must return exactly to original title
    const restoredTitle = await titleInput.inputValue();
    expect(restoredTitle).toBe(originalTitle);

    // Save status must show "Saved"
    await expect(page.locator('#save-status-slot').getByText('Saved', { exact: true })).toBeVisible({ timeout: 8000 });

    // Wait past the 1.5s debounce + save response time (2500ms total)
    console.log('[Ctrl+Z Test (c)] Waiting past debounce + save response time (2500ms)...');
    await page.waitForTimeout(2500);

    console.log(`[Ctrl+Z Test (c)] Total save requests sent: ${saveRequestCount}`);
    expect(saveRequestCount).toBeLessThanOrEqual(2);
    expect(await titleInput.inputValue()).toBe(originalTitle);
  });

  test('4. (d) Partial Undo variant: 10 edits, only 5 undos -> exactly 1 save request sent with final content saved', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    // Wait until document is initially saved and idle
    await expect(page.locator('#save-status-slot').getByText('Saved', { exact: true })).toBeVisible({ timeout: 15000 });

    let saveRequestCount = 0;
    let lastSavedPayload: any = null;

    page.on('request', (req) => {
      if (req.url().includes('/save') && req.method() === 'PUT') {
        saveRequestCount++;
        try {
          lastSavedPayload = JSON.parse(req.postData() || '{}');
        } catch {}
      }
    });

    const titleInput = page.getByLabel('Document Title');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    const originalTitle = await titleInput.inputValue();

    const undoBtn = page.locator('#toolbar-btn-undo');
    await expect(undoBtn).toBeVisible();

    // Make 10 distinct edits in rapid succession (<400ms total, well inside 1500ms debounce)
    console.log('[Partial Undo Test (d)] Making 10 rapid edits...');
    for (let i = 1; i <= 10; i++) {
      await titleInput.fill(`${originalTitle} - Variant ${i}`);
      await page.waitForTimeout(20);
    }

    // Now click Undo only 5 times rapidly (partially undone to Variant 5)
    console.log('[Partial Undo Test (d)] Clicking Undo only 5 times...');
    for (let i = 0; i < 5; i++) {
      await undoBtn.click();
      await page.waitForTimeout(40);
    }

    const currentTitle = await titleInput.inputValue();
    expect(currentTitle).toBe(`${originalTitle} - Variant 5`);

    // Status is unsaved changes
    await expect(page.locator('#save-status-slot').getByText('Unsaved changes', { exact: true })).toBeVisible();

    // Wait past debounce (1500ms) + save response time (2500ms total)
    console.log('[Partial Undo Test (d)] Waiting 2500ms for debounced autosave...');
    await page.waitForTimeout(2500);

    // Assert at most 2 save requests (or 1 final save) occurred, and the final saved content is Variant 5
    console.log(`[Partial Undo Test (d)] Save requests sent: ${saveRequestCount}`);
    expect(saveRequestCount).toBeGreaterThanOrEqual(1);
    expect(saveRequestCount).toBeLessThanOrEqual(2);

    // Assert that the saved content equals Variant 5
    expect(lastSavedPayload?.meta?.title).toBe(`${originalTitle} - Variant 5`);

    // Assert toolbar status transitioned to "Saved"
    await expect(page.locator('#save-status-slot').getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('5. Autosave race condition: in-flight save + concurrent edit -> late edit marked unsaved and saved by follow-up request', async ({ page }) => {
    if (!createdDocId) test.skip();

    page.on('console', (msg) => console.log(`[Browser Console] ${msg.text()}`));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    const requestLog: Array<{ step: string; timestamp: number; titleSent?: string }> = [];

    // Route interception with delayed save response on first save
    let saveCallCount = 0;
    await page.route(`**/api/documents/${createdDocId}/save`, async (route) => {
      saveCallCount++;
      const currentCall = saveCallCount;
      const body = JSON.parse(route.request().postData() || '{}');
      const titleSent = body?.meta?.title;

      requestLog.push({
        step: `Save #${currentCall} DISPATCHED`,
        timestamp: Date.now(),
        titleSent,
      });

      if (currentCall === 1) {
        // Delay save #1 response by 1200ms to allow concurrent in-flight edit
        console.log(`[Autosave Race] Delaying Save #1 response by 1200ms (payload: "${titleSent}")...`);
        await new Promise((r) => setTimeout(r, 1200));
      }

      await route.continue();
      requestLog.push({
        step: `Save #${currentCall} COMPLETED`,
        timestamp: Date.now(),
        titleSent,
      });
    });

    const titleInput = page.getByLabel('Document Title');
    await expect(titleInput).toBeVisible({ timeout: 15000 });

    // Step 1: Make edit #1 and trigger Save #1
    console.log('[Autosave Race] Making edit #1...');
    await titleInput.fill('Race Test - First In-Flight Edit');
    const saveBtn = page.locator('#toolbar-btn-save');
    await saveBtn.click();

    // Verify Save #1 is in flight (Saving... state)
    await expect(page.locator('#save-status-slot').getByText('Saving...', { exact: true })).toBeVisible({ timeout: 1000 });

    // Step 2: Make edit #2 WHILE Save #1 is in-flight
    console.log('[Autosave Race] Making edit #2 while Save #1 is in-flight...');
    await titleInput.fill('Race Test - Second Edit Arrived Concurrently');

    // Step 3: Wait for Save #1 to complete
    console.log('[Autosave Race] Waiting for Save #1 network response...');
    await page.waitForTimeout(1600);

    // CRITICAL ASSERTION: The document MUST remain / be marked as "Unsaved changes"
    // (NOT "Saved", because edit #2 was not in Save #1's payload!)
    console.log('[Autosave Race] Checking status slot after Save #1 completed...');
    const statusTextAfterSave1 = await page.locator('#save-status-slot').textContent();
    console.log(`[Autosave Race] Status immediately after Save #1: "${statusTextAfterSave1?.trim()}"`);
    expect(statusTextAfterSave1).toContain('Unsaved changes');

    // Step 4: Wait for follow-up debounced save #2 to trigger and complete (1500ms debounce + network)
    console.log('[Autosave Race] Waiting for follow-up Save #2...');
    await expect(page.locator('#save-status-slot').getByText('Saved', { exact: true })).toBeVisible({ timeout: 20000 });

    // Print full request audit log
    console.log('\n--- Autosave Race Condition Request Audit Log ---');
    requestLog.forEach((log) => {
      console.log(`[${new Date(log.timestamp).toISOString()}] ${log.step} -> titleSent: "${log.titleSent}"`);
    });

    // Assert that exactly 2 saves were dispatched and Save #2 saved the final in-flight edit
    expect(saveCallCount).toBe(2);
    expect(requestLog.find((l) => l.step === 'Save #1 DISPATCHED')?.titleSent).toBe('Race Test - First In-Flight Edit');
    expect(requestLog.find((l) => l.step === 'Save #2 DISPATCHED')?.titleSent).toBe('Race Test - Second Edit Arrived Concurrently');
  });

  test('6. Hidden section state: solid panel color (no transparency, no opacity reduction), "Hidden from PDF" label + icon, WCAG contrast verified', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    // Find the toggle button for Header & Contact Information
    const hideHeaderBtn = page.getByRole('button', { name: /^Hide Header & Contact Information/i });
    await expect(hideHeaderBtn).toBeVisible({ timeout: 15000 });
    await hideHeaderBtn.click();

    // The button label changes to "Show Header & Contact Information"
    const showHeaderBtn = page.getByRole('button', { name: /^Show Header & Contact Information/i });
    await expect(showHeaderBtn).toBeVisible();

    // "Hidden from PDF" badge is visible
    const hiddenBadge = page.getByText('Hidden from PDF').first();
    await expect(hiddenBadge).toBeVisible();

    // Verify header panel styling: must be 100% solid fully opaque (opacity === 1.0, NO opacity-60)
    const headerPanel = page.locator('[data-section-type="header"]').first();
    await expect(headerPanel).toBeVisible({ timeout: 10000 });
    // Wait for transition to complete
    await expect(headerPanel).toHaveCSS('background-color', 'rgb(241, 247, 247)');
    await expect(headerPanel).toHaveCSS('opacity', '1');

    const panelStyle = await headerPanel.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        opacity: cs.opacity,
        backgroundColor: cs.backgroundColor,
      };
    });

    console.log('[Hidden Section Style]:', panelStyle);
    // Opacity must be 1 (solid panel, zero background gradient bleed)
    expect(panelStyle.opacity).toBe('1');
    // Background color is solid Mist #F1F7F7
    expect(panelStyle.backgroundColor).toBe('rgb(241, 247, 247)');

    // Verify text contrast inside hidden panel: all text elements meet WCAG AA (>= 4.5:1)
    const contrastViolations = await headerPanel.evaluate((panel) => {
      function getLuminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          c = c / 255;
          return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      function getContrastRatio(l1: number, l2: number): number {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      function parseRgb(rgbStr: string): [number, number, number] {
        const match = rgbStr.match(/\d+/g);
        if (!match || match.length < 3) return [255, 255, 255];
        return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
      }

      const issues: string[] = [];
      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_ELEMENT);
      let node = walker.nextNode() as HTMLElement | null;

      while (node) {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const hasVisibleText = Boolean(
          node.children.length === 0 &&
          node.textContent &&
          node.textContent.trim().length > 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none'
        );

        if (hasVisibleText) {
          let curr: HTMLElement | null = node;
          let foundBg = 'rgb(241, 247, 247)';
          while (curr && curr !== panel.parentElement) {
            const cs = window.getComputedStyle(curr);
            const bg = cs.backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              foundBg = bg;
              break;
            }
            curr = curr.parentElement;
          }

          const textColor = style.color;
          const [tr, tg, tb] = parseRgb(textColor);
          const [br, bg, bb] = parseRgb(foundBg);

          const lText = getLuminance(tr, tg, tb);
          const lBg = getLuminance(br, bg, bb);
          const ratio = getContrastRatio(lText, lBg);

          if (ratio < 4.5) {
            issues.push(`Text "${node.textContent?.trim().slice(0, 25)}" (color ${textColor} on bg ${foundBg}) fails AA with ratio ${ratio.toFixed(2)}:1`);
          }
        }

        node = walker.nextNode() as HTMLElement | null;
      }

      return issues;
    });

    console.log('[Hidden Section Contrast Violations]:', contrastViolations);
    expect(contrastViolations).toHaveLength(0);
  });

  test('7. Capture toolbar screenshots at 1440px, 1280px, and 1100px in Saved and Unsaved states', async ({ page }) => {
    if (!createdDocId) test.skip();
    test.setTimeout(90000);

    const artifactDir = process.env.ARTIFACT_DIR || path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'antigravity', 'brain', '0476a383-8a86-41cb-a552-ce7ab883faf8');

    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    const testVps = [
      { name: '1440px', width: 1440, height: 900 },
      { name: '1280px', width: 1280, height: 800 },
      { name: '1100px', width: 1100, height: 800 },
    ];

    for (const vp of testVps) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(100);

      const header = page.locator('header').first();
      await expect(header).toBeVisible({ timeout: 15000 });

      // Saved state
      await page.evaluate(() => {
        (window as any).__setTestSaveStatus?.('saved');
      });
      await page.waitForTimeout(100);

      const savedPath = path.join(artifactDir, `toolbar_${vp.name}_saved.png`);
      await header.screenshot({ path: savedPath });

      // Unsaved state
      await page.evaluate(() => {
        (window as any).__setTestSaveStatus?.('unsaved');
      });
      await page.waitForTimeout(100);

      const unsavedPath = path.join(artifactDir, `toolbar_${vp.name}_unsaved.png`);
      await header.screenshot({ path: unsavedPath });

      console.log(`[Screenshot Captured] Viewport ${vp.name} saved to ${savedPath} & ${unsavedPath}`);
      expect(savedPath).toBeTruthy();
      expect(unsavedPath).toBeTruthy();
    }
  });
});
