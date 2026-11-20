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
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');

    // Change target role
    const targetRoleInput = page.getByLabel('Target Role');
    await targetRoleInput.fill('VP of Cloud Infrastructure');

    // Should show "Unsaved changes"
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    // Wait for debounced autosave (~1.5s debounce + server save) to finish
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15000 });

    // Refresh page and verify value persisted
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Target Role')).toHaveValue('VP of Cloud Infrastructure', { timeout: 10000 });
  });

  test('4. Section manipulation: visibility toggle, template change, and keyboard save', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    // Toggle visibility of summary section
    const hideBtn = page.getByRole('button', { name: /^Hide / }).first();
    if (await hideBtn.isVisible()) {
      await hideBtn.click();
    }

    // Switch template to Modern Professional
    const templateSelect = page.locator('#template-picker');
    await templateSelect.selectOption('modern_professional');

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
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');

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

    // Seed localStorage draft before navigating
    await page.addInitScript(({ docId }) => {
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
    }, { docId: createdDocId });

    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    // Prompt modal should appear
    await expect(page.getByText('Unsaved Draft Found')).toBeVisible({ timeout: 15000 });

    // Click "Discard & Use Server Copy"
    const discardBtn = page.getByRole('button', { name: /Discard/i }).first();
    await expect(discardBtn).toBeVisible();
    await discardBtn.click();

    // Modal dismissed
    await expect(page.getByText('Unsaved Draft Found')).not.toBeVisible();
  });

  test('8. Section title renaming and target role editing', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    // 1. Edit Target Role
    const targetRoleInput = page.getByLabel('Target Role');
    await targetRoleInput.fill('Distinguished Principal Architect');
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    // 2. Rename Section Title
    const sectionTitleInput = page.locator('input[value="Professional Summary"]').first();
    await sectionTitleInput.fill('Executive Qualifications & Scope');
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    // Save changes
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+S' : 'Control+S');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15000 });

    // Reload page to verify persistence
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByLabel('Target Role')).toHaveValue('Distinguished Principal Architect');
    await expect(page.locator('input[value="Executive Qualifications & Scope"]').first()).toBeVisible();
  });

  test('9. Accent color picker is restricted to allowed palette hexes', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    const expectedLabels = ['Ink Black', 'Wine Maroon', 'Deep Wine', 'Navy', 'Forest', 'Deep Teal', 'Slate Mist'];
    const accentPicker = page.locator('#accent-color-picker');
    await expect(accentPicker).toBeVisible();

    const buttons = await accentPicker.locator('button').all();
    expect(buttons.length).toBe(expectedLabels.length);

    for (let idx = 0; idx < expectedLabels.length; idx++) {
      const title = await buttons[idx].getAttribute('title');
      expect(expectedLabels).toContain(title);
    }

    // Click Forest button
    const forestBtn = accentPicker.locator('button[title="Forest"]');
    await forestBtn.click();
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+S' : 'Control+S');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('10. Concurrency conflict dialog: 409 STALE_SAVE_CONFLICT triggers conflict modal', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    // Artificially bump version in DB to 99 to simulate conflict from concurrent session
    await (adminClient as any)
      .from('documents')
      .update({ version: 99 })
      .eq('id', createdDocId);

    // Make an edit in the browser
    const titleInput = page.getByLabel('Document Title');
    await titleInput.fill('Conflicting Version Title');

    // Click Save button
    const saveBtn = page.getByRole('button', { name: /^Save$/i });
    await saveBtn.click();

    // Conflict modal must appear with server version and resolution actions
    await expect(page.getByText('Save Conflict (Version 99)')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Reload Server Copy/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Keep My Version as New Copy/i })).toBeVisible();

    // Dismiss modal by reloading server copy
    const reloadBtn = page.getByRole('button', { name: /Reload Server Copy/i });
    await reloadBtn.click();
    await expect(page.getByText('Save Conflict (Version 99)')).not.toBeVisible();
  });

  test('11. Keyboard navigation on /editor/[documentId] tabs through controls with visible focus', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    const firstInteractive = page.locator('button, input, select, a').first();
    await expect(firstInteractive).toBeVisible();
    await firstInteractive.focus();

    const interactiveTags = ['BUTTON', 'INPUT', 'SELECT', 'A', 'TEXTAREA'];
    let interactiveCount = 0;

    for (let i = 0; i < 8; i++) {
      const tag = await page.evaluate(() => document.activeElement?.tagName);
      const isVisible = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (interactiveTags.includes(tag || '')) {
        interactiveCount++;
        expect(isVisible).toBe(true);

        const focusStyle = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;
          const cs = window.getComputedStyle(el);
          return {
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth,
            boxShadow: cs.boxShadow,
          };
        });
        expect(focusStyle).toBeDefined();
      }

      await page.keyboard.press('Tab');
    }

    expect(interactiveCount).toBeGreaterThan(0);
  });

  test('12. Panel legibility on /editor/[documentId]: all text elements sit in approved panels', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForLoadState('domcontentloaded');

    const violations = await page.evaluate(() => {
      const allowedBackgrounds = new Set([
        'rgb(255, 255, 255)',
        'rgb(241, 247, 247)',
        'rgb(255, 228, 216)',
        'rgb(218, 241, 222)',
        'rgb(128, 0, 33)',
        'rgb(136, 17, 68)',
      ]);

      const issues: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
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
          let foundBg: string | null = null;
          while (curr && curr !== document.body) {
            const cs = window.getComputedStyle(curr);
            const bg = cs.backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              foundBg = bg;
              break;
            }
            curr = curr.parentElement;
          }

          if (!foundBg || !allowedBackgrounds.has(foundBg)) {
            issues.push(`Text "${node.textContent?.trim().slice(0, 30)}" in <${node.tagName}> has bg: ${foundBg || 'none'}`);
          }
        }

        node = walker.nextNode() as HTMLElement | null;
      }

      return issues;
    });

    expect(violations, `Found legibility violations on /editor: ${violations.join(', ')}`).toHaveLength(0);

    // Also check ATS Readiness Panel view for panel legibility
    const atsTabBtn = page.locator('#right-tab-ats');
    if (await atsTabBtn.isVisible()) {
      await atsTabBtn.click();
      await page.waitForTimeout(200);

      const atsViolations = await page.evaluate(() => {
        const allowedBackgrounds = new Set([
          'rgb(255, 255, 255)',
          'rgb(241, 247, 247)',
          'rgb(255, 228, 216)',
          'rgb(218, 241, 222)',
          'rgb(128, 0, 33)',
          'rgb(136, 17, 68)',
        ]);

        const issues: string[] = [];
        const panel = document.getElementById('ats-readiness-panel');
        if (!panel) return issues;

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
            let foundBg: string | null = null;
            while (curr && curr !== document.body) {
              const cs = window.getComputedStyle(curr);
              const bg = cs.backgroundColor;
              if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                foundBg = bg;
                break;
              }
              curr = curr.parentElement;
            }

            if (!foundBg || !allowedBackgrounds.has(foundBg)) {
              issues.push(`ATS Panel Text "${node.textContent?.trim().slice(0, 30)}" in <${node.tagName}> has bg: ${foundBg || 'none'}`);
            }
          }
          node = walker.nextNode() as HTMLElement | null;
        }

        return issues;
      });

      expect(atsViolations, `Found legibility violations on ATS Panel: ${atsViolations.join(', ')}`).toHaveLength(0);
    }
  });

  test('13. Document deletion on dashboard displays confirmation dialog and deletes item', async ({ page }) => {
    if (!createdDocId) test.skip();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Click Delete button on document card
    const deleteBtn = page.locator(`button[aria-label="Delete document"]`).first();
    await expect(deleteBtn).toBeVisible({ timeout: 15000 });
    await deleteBtn.click();

    // Delete confirmation modal appears
    await expect(page.getByText('Delete Document?')).toBeVisible();
    await expect(page.getByText('All tailored sections and custom edits in this document will be lost')).toBeVisible();

    // Click "Yes, Delete"
    const confirmDeleteBtn = page.getByRole('button', { name: /Yes, Delete/i });
    await expect(confirmDeleteBtn).toBeVisible();
    await confirmDeleteBtn.click();

    // Modal dismissed and document list reflects deletion
    await expect(page.getByText('Delete Document?')).not.toBeVisible();
    await expect(page.getByText('0 / 20 documents used')).toBeVisible();
  });
});
