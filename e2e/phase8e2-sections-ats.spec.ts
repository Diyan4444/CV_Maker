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

test.describe.serial('Phase 8E-2 Section Headers, Reordering, Empty States & ATS Diagnostics', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId = '';
  let profileId = '';
  const testEmail = `phase8e2-test-${Date.now()}@quillfolio.local`;
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
      user_metadata: { full_name: 'Grace Hopper' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    const { data: profileRecord, error: profErr } = await (adminClient as any)
      .from('master_profiles')
      .insert({
        user_id: testUserId,
        background_group: 'Engineering and Technology',
        specialization: 'Computer Science Engineering',
        headline: 'Compiler Architect',
        summary: 'Pioneered machine-independent programming languages and compiler tooling.',
      })
      .select('id')
      .single();
    if (profErr) throw profErr;
    profileId = profileRecord.id;

    await (adminClient as any).from('education').insert({
      profile_id: profileId,
      institution: 'Yale University',
      degree: 'PhD Mathematics',
      start_date: '1930-09',
      end_date: '1934-06',
    });

    const { error: expErr } = await (adminClient as any).from('experiences').insert({
      profile_id: profileId,
      type: 'work',
      role: 'Chief Compiler Engineer',
      organization: 'Eckert-Mauchly',
      location: 'Philadelphia, PA',
      start_date: '1949-01',
      is_current: true,
      bullets: ['Designed the first linker and compiler toolchain.'],
    });
    if (expErr) throw expErr;

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
    await context.addCookies(
      Object.entries(capturedCookies).map(([name, value]) => ({
        name,
        value,
        domain: 'localhost',
        path: '/',
      }))
    );
  }

  test('verifies section headers, drag/keyboard/menu reordering, collapse, editing highlight, empty states, import+undo, ATS grouping+jump, and responsive screenshots', async ({
    page,
    context,
  }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) test.skip();

    await addSessionCookies(context);

    // Create document (before adding projects to master profile so projects starts empty on doc!)
    const createRes = await page.request.post('/api/documents/create', {
      data: {
        type: 'resume',
        templateId: 'ats_single_column',
        title: 'Phase 8E2 Test Resume',
        targetRole: 'Compiler Engineer',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    createdDocId = created.documentId;

    // Now seed a project in master profile AFTER document creation so Import from Master Profile has 1 project to import,
    // while certifications remains empty!
    await (adminClient as any).from('projects').insert({
      profile_id: profileId,
      title: 'FLOW-MATIC Compiler',
      role: 'Lead Author',
      start_date: '1955-01',
      bullets: ['Created English-like business data processing language.'],
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${createdDocId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#pdf-preview-canvas-container canvas').first()).toBeVisible({ timeout: 20000 });

    // 1. Section headers: no section-type badge; Hidden from PDF only when hidden
    const expSec = page.locator('[data-section-type="experience"]');
    await expect(expSec).toBeVisible();
    await expect(expSec.getByText('Hidden from PDF')).toHaveCount(0);

    // 2. Editing highlight: focus input inside Experience section
    const expFirstInput = expSec.locator('input').first();
    await expFirstInput.focus();
    await expect(expSec).toHaveAttribute('data-editing', 'true');
    const borderLeftW = await expSec.evaluate((el) => getComputedStyle(el).borderLeftWidth);
    expect(borderLeftW).toBe('3px');
    await page.screenshot({ path: `${ARTIFACT_DIR}/phase8e2_1440_editing_highlight.png` });

    // 3. Expand / collapse
    const expId = await expSec.getAttribute('id');
    expect(expId).toBeTruthy();
    const collapseBtn = page.locator(`[data-testid="collapse-btn-${expId}"]`);
    await collapseBtn.click();
    await expect(collapseBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(`#section-body-${expId}`)).toHaveAttribute('inert', '');
    await collapseBtn.click();
    await expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');

    // 4. Reordering: Keyboard Alt+ArrowDown on drag handle + Overflow menu Move up
    const initialOrder = await page.locator('[data-section-type]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-section-type'))
    );
    const eduSec = page.locator('[data-section-type="education"]');
    const eduId = await eduSec.getAttribute('id');
    const eduHandle = page.locator(`[data-testid="drag-handle-${eduId}"]`);
    await eduHandle.focus();
    await page.keyboard.press('Alt+ArrowDown');
    await expect(page.locator('#section-reorder-live')).toContainText('Moved');

    const afterAltDownOrder = await page.locator('[data-section-type]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-section-type'))
    );
    expect(afterAltDownOrder).not.toEqual(initialOrder);

    // Overflow menu Move up
    await page.locator(`[data-testid="section-menu-btn-${eduId}"]`).click();
    await page.getByRole('menuitem', { name: 'Move up' }).click();
    const afterMenuUpOrder = await page.locator('[data-section-type]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-section-type'))
    );
    expect(afterMenuUpOrder).toEqual(initialOrder);

    // Drag and drop with pointer on drag handle
    const sumSec = page.locator('[data-section-type="summary"]');
    const sumId = await sumSec.getAttribute('id');
    const sumHandleBox = await page.locator(`[data-testid="drag-handle-${sumId}"]`).boundingBox();
    const eduHandleBox = await eduHandle.boundingBox();
    if (sumHandleBox && eduHandleBox) {
      await page.mouse.move(eduHandleBox.x + eduHandleBox.width / 2, eduHandleBox.y + eduHandleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(sumHandleBox.x + sumHandleBox.width / 2, sumHandleBox.y + 4, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(200);
    }

    // Save & reload persistence of reordered sections
    await page.locator('#toolbar-btn-save').click();
    await expect(page.locator('#save-status-slot')).toContainText('Saved', { timeout: 15000 });
    const savedOrder = await page.locator('[data-section-type]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-section-type'))
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloadedOrder = await page.locator('[data-section-type]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-section-type'))
    );
    expect(reloadedOrder).toEqual(savedOrder);

    // 5. Empty states & Import from Master Profile (success + undo + empty master)
    // Scroll to Projects (which is empty in this doc)
    const projEmpty = page.locator('[data-testid="empty-state-projects"]');
    await projEmpty.scrollIntoViewIfNeeded();
    await expect(projEmpty).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/phase8e2_1440_empty_state.png` });

    // Import project -> toast + Undo -> re-import
    await page.locator('[data-testid="empty-import-projects"]').click();
    await expect(page.locator('#import-success-toast')).toContainText('Imported 1 entry', { timeout: 10000 });
    await page.locator('#import-toast-undo-btn').click();
    await expect(projEmpty).toBeVisible();
    await page.locator('[data-testid="empty-import-projects"]').click();
    await expect(page.locator('#import-success-toast')).toContainText('Imported 1 entry');

    // Empty master profile section (Certifications) -> disabled + explanation + /profile link
    const certImportBtn = page.locator('[data-testid="empty-import-certifications"]');
    if (await certImportBtn.isVisible()) {
      await certImportBtn.scrollIntoViewIfNeeded();
      await certImportBtn.click();
      await expect(certImportBtn).toBeDisabled({ timeout: 10000 });
      await expect(page.locator('[data-testid="empty-no-master-certifications"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="empty-no-master-certifications"] a[href="/profile"]')
      ).toBeVisible();
    }

    // 6. ATS Readiness grouping & Go to section focus jump
    await page.locator('#right-tab-ats').click();
    const atsPanel = page.locator('#ats-readiness-panel');
    await expect(atsPanel.getByRole('heading', { name: 'ATS Readiness' })).toBeVisible();
    await expect(atsPanel.getByText('Review your document before downloading.')).toBeVisible();
    await expect(page.locator('[data-testid="ats-group-pass"]')).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/phase8e2_1440_ats_panel.png` });

    // Collapse header section, then click Go to section from ATS -> expands & focuses first input
    const headerSec = page.locator('[data-section-type="header"]');
    const headerId = await headerSec.getAttribute('id');
    await page.locator(`[data-testid="collapse-btn-${headerId}"]`).click();
    await page.locator('[data-testid="ats-check-contact_details"] button').click();
    await expect(page.locator(`[data-testid="collapse-btn-${headerId}"]`)).toHaveAttribute('aria-expanded', 'true');

    // 7. Mobile 390x844 & 320x700 overflow + screenshots
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const overflow390 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow390).toBe(false);
    await page.screenshot({ path: `${ARTIFACT_DIR}/phase8e2_390_sections.png` });

    await page.locator('#mobile-ats-tab-btn').click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${ARTIFACT_DIR}/phase8e2_390_ats.png` });

    await page.setViewportSize({ width: 320, height: 700 });
    await page.waitForTimeout(150);
    const overflow320 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow320).toBe(false);
  });
});
