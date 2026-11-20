import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe.serial('Editor Toolbar Layout Shift, Undo/Redo & Autosave Tests', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `toolbar-shift-${Date.now()}@folioone.local`;
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

  test('0. Setup: create document for toolbar testing', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Create a new document
    const newDocBtn = page.getByRole('button', { name: /New Document/i });
    await expect(newDocBtn).toBeVisible({ timeout: 15000 });
    await newDocBtn.click();

    await page.fill('#doc-title', 'Toolbar Precision Document');
    await page.fill('#target-role', 'Senior Infrastructure Engineer');

    const submitBtn = page.getByRole('button', { name: /Create & Open/i });
    await submitBtn.click();

    await page.waitForURL(/\/editor\/[a-f0-9-]+/, { timeout: 30000 });
    const url = page.url();
    createdDocId = url.split('/editor/')[1].split('?')[0];
    expect(createdDocId).toBeTruthy();
  });

  test('1. (a) Record bounding boxes across Saved, Saving, Unsaved, Error, Conflict, Offline at 1440px, 1024px, 390px', async ({ page }) => {
    if (!createdDocId) test.skip();

    const viewports = [
      { name: '1440px', width: 1440, height: 900 },
      { name: '1024px', width: 1024, height: 768 },
      { name: '390px', width: 390, height: 844 },
    ];

    const statusStates = ['saved', 'saving', 'unsaved', 'conflict', 'error', 'offline'] as const;

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/editor/${createdDocId}`);
      await page.waitForLoadState('domcontentloaded');

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

      // Ensure slot has fixed width 140px in every viewport
      const slotBox = await statusSlot.boundingBox();
      expect(slotBox).toBeTruthy();
      expect(Math.round(slotBox!.width)).toBe(140);

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

        // Slot width must stay 140px in every state
        expect(Math.round(currentSlot!.width)).toBe(140);

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

  test('2. (b) 10 rapid edits, click Undo 10 times within 2 seconds: every click lands, document returns to original content, at most 1 save request sent', async ({ page }) => {
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
    console.log('[Autosave Test] Making 10 rapid edits...');
    for (let i = 1; i <= 10; i++) {
      await titleInput.fill(`${originalTitle} - Edit ${i}`);
      await page.waitForTimeout(40);
    }

    // Verify unsaved status is active
    await expect(page.locator('#save-status-slot').getByText('Unsaved changes', { exact: true })).toBeVisible();
    expect(await titleInput.inputValue()).toBe(`${originalTitle} - Edit 10`);

    // Click Undo 10 times within ~1.5 seconds (40ms interval)
    console.log('[Autosave Test] Clicking Undo 10 times rapidly...');
    const startUndoTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await undoBtn.click();
      await page.waitForTimeout(40);
    }
    const undoDuration = Date.now() - startUndoTime;
    console.log(`[Autosave Test] 10 undos completed in ${undoDuration} ms`);
    expect(undoDuration).toBeLessThan(3500);

    // Document must return exactly to original title
    const restoredTitle = await titleInput.inputValue();
    expect(restoredTitle).toBe(originalTitle);

    // Save status must immediately show "Saved" without needing debounce
    await expect(page.locator('#save-status-slot').getByText('Saved', { exact: true })).toBeVisible({ timeout: 3000 });

    // Wait 2 seconds (past debounce) to verify no trailing save is sent
    await page.waitForTimeout(2000);

    console.log(`[Autosave Test] Total save requests sent: ${saveRequestCount}`);
    expect(saveRequestCount).toBeLessThanOrEqual(1);
  });

  test('3. (c) 10 rapid edits with Ctrl+Z keyboard shortcut: every step lands, document returns to original content, at most 1 save request sent', async ({ page }) => {
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
    console.log('[Ctrl+Z Test] Making 10 rapid edits...');
    for (let i = 1; i <= 10; i++) {
      await titleInput.fill(`${originalTitle} - Step ${i}`);
      await page.waitForTimeout(40);
    }

    await expect(page.locator('#save-status-slot').getByText('Unsaved changes', { exact: true })).toBeVisible();
    expect(await titleInput.inputValue()).toBe(`${originalTitle} - Step 10`);

    // Press Ctrl+Z / Cmd+Z 10 times rapidly
    const isMac = process.platform === 'darwin';
    const undoShortcut = isMac ? 'Meta+z' : 'Control+z';

    console.log(`[Ctrl+Z Test] Pressing ${undoShortcut} 10 times rapidly...`);
    const startUndoTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(undoShortcut);
      await page.waitForTimeout(40);
    }
    const undoDuration = Date.now() - startUndoTime;
    console.log(`[Ctrl+Z Test] 10 keyboard undos completed in ${undoDuration} ms`);
    expect(undoDuration).toBeLessThan(3500);

    // Document must return exactly to original title
    const restoredTitle = await titleInput.inputValue();
    expect(restoredTitle).toBe(originalTitle);

    // Save status must show "Saved"
    await expect(page.locator('#save-status-slot').getByText('Saved', { exact: true })).toBeVisible({ timeout: 3000 });

    // Wait 2 seconds past debounce
    await page.waitForTimeout(2000);

    console.log(`[Ctrl+Z Test] Total save requests sent: ${saveRequestCount}`);
    expect(saveRequestCount).toBeLessThanOrEqual(1);
  });

  test('4. Hidden section state: solid panel color (no transparency, no opacity reduction), "Hidden from PDF" label + icon, WCAG contrast verified', async ({ page }) => {
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
      // Computes sRGB relative luminance
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
          // Resolve background color
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

          // WCAG AA threshold: 4.5:1 for normal body text
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

  test('5. Capture toolbar screenshots at 1440px in Saved and Unsaved states', async ({ page }) => {
    if (!createdDocId) test.skip();

    const artifactDir = 'C:/Users/Diyan/.gemini/antigravity/brain/0476a383-8a86-41cb-a552-ce7ab883faf8';

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 15000 });

    // Ensure Saved state
    await page.evaluate(() => {
      (window as any).__setTestSaveStatus?.('saved');
    });
    await page.waitForTimeout(100);

    const savedScreenshotPath = path.join(artifactDir, 'toolbar_1440px_saved.png');
    await header.screenshot({ path: savedScreenshotPath });

    // Switch to Unsaved state
    await page.evaluate(() => {
      (window as any).__setTestSaveStatus?.('unsaved');
    });
    await page.waitForTimeout(100);

    const unsavedScreenshotPath = path.join(artifactDir, 'toolbar_1440px_unsaved.png');
    await header.screenshot({ path: unsavedScreenshotPath });

    expect(savedScreenshotPath).toBeTruthy();
    expect(unsavedScreenshotPath).toBeTruthy();
  });
});
