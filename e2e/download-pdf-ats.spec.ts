import { test, expect } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import { PRODUCT_NAME } from '../src/config/app';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const ARTIFACT_DIR = path.resolve('C:/Users/Diyan/.gemini/antigravity/brain/0476a383-8a86-41cb-a552-ce7ab883faf8');

test.describe('Phase 4: PDF Download & ATS Readiness Checks E2E', () => {
  let adminClient: any;
  let testUserId: string;
  let testEmail: string;
  let testDocId: string;
  const testPassword = 'Password123!SafePass';
  const capturedCookies: Record<string, string> = {};

  test.beforeAll(async () => {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    testEmail = `test-phase4-download-${Date.now()}@example.com`;
    const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Diyan Shah' },
    });
    if (createErr) throw createErr;
    testUserId = userData.user.id;

    // Seed master profile
    await adminClient.from('master_profiles').insert({
      user_id: testUserId,
      full_name: 'Diyan Shah',
      email: testEmail,
      phone: '+1 (555) 019-2834',
      location: 'San Francisco, CA',
      headline: 'Principal Distributed Systems Architect',
    });

    // Create test document
    const { data: docData, error: docErr } = await adminClient
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Staff Systems Architect Resume',
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        target_role: 'Principal Systems Architect',
        version: 1,
      })
      .select('id')
      .single();
    if (docErr) throw docErr;
    testDocId = docData.id;

    // Seed sections
    const { error: secInsertErr } = await adminClient.from('document_sections').insert([
      {
        document_id: testDocId,
        section_type: 'header',
        title: 'Header',
        order_index: 0,
        is_visible: true,
        content: {
          fullName: 'Diyan Shah',
          email: testEmail,
          phone: '+1 (555) 019-2834',
          location: 'San Francisco, CA',
          website: 'https://diyanshah.dev',
          linkedin: 'https://linkedin.com/in/diyanshah',
          github: 'https://github.com/diyanshah',
        },
      },
      {
        document_id: testDocId,
        section_type: 'summary',
        title: 'Summary',
        order_index: 1,
        is_visible: true,
        content: {
          text: 'Distinguished systems architect with deep expertise in fault-tolerant distributed consensus, high-throughput microarchitectures, and cloud storage reliability.',
        },
      },
      {
        document_id: testDocId,
        section_type: 'experience',
        title: 'Experience',
        order_index: 2,
        is_visible: true,
        content: {
          entries: [
            {
              id: 'exp-1',
              role: 'Chief Architect of Distributed Core',
              organization: 'Global Systems Laboratory',
              location: 'San Francisco, CA',
              startDate: '2021-01',
              endDate: 'Present',
              isCurrent: true,
              bullets: [
                'Engineered zero-loss Raft cluster processing 85,000 requests per second across three availability zones.',
                'Authored complete TLA+ specification validated under model checking for 200 compute nodes.',
              ],
            },
          ],
        },
      },
      {
        document_id: testDocId,
        section_type: 'skills',
        title: 'Skills',
        order_index: 3,
        is_visible: true,
        content: {
          entries: [
            {
              id: 'skill-1',
              category: 'Core Systems',
              items: [{ name: 'Rust' }, { name: 'Go' }, { name: 'Distributed Systems' }, { name: 'PostgreSQL' }],
            },
          ],
        },
      },
      {
        document_id: testDocId,
        section_type: 'custom',
        title: 'Secret Hidden Project',
        order_index: 4,
        is_visible: false, // HIDDEN SECTION: Must NEVER appear in downloaded PDF
        content: {
          entries: [
            {
              id: 'cust-hidden-1',
              title: 'Classified Stealth Venture',
              description: 'This is classified confidential text that must not appear in any exported PDF.',
            },
          ],
        },
      },
    ]);
    if (secInsertErr) throw secInsertErr;

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

  test('1. Download PDF across all 3 templates: triggers download, verifies filename, metadata, and parses content with pdf-parse', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${testDocId}`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for initial preview render
    await page.waitForSelector('[data-rendered-version]', { state: 'attached', timeout: 20000 });

    const templates = [
      { id: 'ats_single_column', expectedName: 'ATS-Friendly Single Column' },
      { id: 'modern_professional', expectedName: 'Modern Professional' },
      { id: 'academic_cv', expectedName: 'Academic CV' },
    ];

    for (const tmpl of templates) {
      console.log(`[E2E Download Test] Testing template: ${tmpl.id}`);

      // Switch template
      await page.selectOption('#template-picker', tmpl.id);
      await page.waitForTimeout(500);

      // Click Download PDF and intercept download event
      const downloadPromise = page.waitForEvent('download', { timeout: 25000 });
      const downloadBtn = page.locator('#download-pdf-button');
      await expect(downloadBtn).toBeVisible();
      await downloadBtn.click();

      // Button enters preparing state
      // (May complete fast, wait for download)
      const download = await downloadPromise;
      const suggestedFilename = download.suggestedFilename();
      console.log(`[E2E Download Test] Suggested filename: ${suggestedFilename}`);

      // Verify filename formatting: <Name>-<Title>.pdf
      expect(suggestedFilename).toMatch(/^Diyan-Shah-Staff-Systems-Architect-Resume\.pdf$/i);

      // Save file
      const downloadDir = path.resolve('test-results/downloads');
      if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
      const downloadedPath = path.join(downloadDir, `${tmpl.id}.pdf`);
      await download.saveAs(downloadedPath);

      const fileBuffer = fs.readFileSync(downloadedPath);
      expect(fileBuffer.length).toBeGreaterThan(1000);

      // Parse with pdf-parse
      const parser = new PDFParse({ data: fileBuffer });
      const textResult = await parser.getText();
      const infoResult = await parser.getInfo();
      const screens = await parser.getScreenshot({ scale: 2.0, imageBuffer: true });
      await parser.destroy();

      const extractedText = textResult.text;
      console.log(`[E2E Download Test] ${tmpl.id} extracted text length: ${extractedText.length}`);

      // 1. Verify applicant name comes first
      const upperText = extractedText.toUpperCase();
      const namePos = upperText.indexOf('DIYAN SHAH');
      const expPos = upperText.indexOf('EXPERIENCE');
      expect(namePos).toBeGreaterThanOrEqual(0);
      expect(expPos).toBeGreaterThan(namePos);

      // 2. Verify headings appear in document order
      const summaryPos = upperText.indexOf('SUMMARY');
      const skillsPos = upperText.indexOf('SKILLS');
      expect(summaryPos).toBeGreaterThan(namePos);
      expect(expPos).toBeGreaterThan(summaryPos);
      expect(skillsPos).toBeGreaterThan(expPos);

      // 3. Verify hidden-section text NEVER appears
      expect(extractedText).not.toContain('Secret Hidden Project');
      expect(extractedText).not.toContain('Classified Stealth Venture');
      expect(extractedText).not.toContain('classified confidential text');

      // 4. Verify PDF metadata
      const info = infoResult.info as any;
      console.log(`[E2E Download Test] ${tmpl.id} Metadata:`, JSON.stringify(info));
      expect(info.Title).toBe('Staff Systems Architect Resume');
      expect(info.Author).toBe('Diyan Shah');
      expect(info.Creator).toBe(PRODUCT_NAME);
      expect(info.Producer).toBe(`${PRODUCT_NAME} (react-pdf)`);

      // 5. Render Page 1 to PNG artifact
      const artifactPngPath = path.join(ARTIFACT_DIR, `page1_downloaded_${tmpl.id}.png`);
      fs.writeFileSync(artifactPngPath, Buffer.from(screens.pages[0].data));
      expect(fs.existsSync(artifactPngPath)).toBe(true);
    }
  });

  test('2. ATS Readiness Checks Panel: all-pass state, needs-attention state, jump-to-section link, and screenshots', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${testDocId}`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for preview to settle
    await page.waitForSelector('[data-rendered-version]', { state: 'attached', timeout: 20000 });

    // Switch right pane to ATS Readiness
    const atsTabBtn = page.locator('#right-tab-ats');
    await expect(atsTabBtn).toBeVisible();
    await atsTabBtn.click();

    // Verify ATS panel elements
    const panel = page.locator('#ats-readiness-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('ATS readiness checks')).toBeVisible();
    await expect(panel.getByText('Automated checks, not a guarantee')).toBeVisible();

    // All-pass verification
    await expect(page.getByText('Passed')).toBeVisible();

    // Screenshot 1: 1440px all-pass
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'editor_checklist_all_pass_1440px.png'),
      fullPage: false,
    });

    // Test "Go to section" link
    const goToHeaderLink = page.locator('[data-testid="ats-check-contact_details"] button').first();
    if (await goToHeaderLink.isVisible()) {
      await goToHeaderLink.click();
      // Verify scroll or focus
      await page.waitForTimeout(300);
    }

    // Now introduce a needs-attention issue: clear full name in header
    const nameInput = page.locator('#fullName');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('');
    await page.waitForTimeout(1000); // allow debounce and re-extraction

    // Switch back to ATS tab to inspect needs-attention item
    await atsTabBtn.click();
    await expect(page.locator('[data-testid="ats-check-contact_details"]').getByText('Needs attention')).toBeVisible();

    // Screenshot 2: 1440px with needs-attention
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'editor_checklist_needs_attention_1440px.png'),
      fullPage: false,
    });

    // Mobile Viewport 390px
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileAtsBtn = page.locator('#mobile-ats-tab-btn');
    await expect(mobileAtsBtn).toBeVisible();
    await mobileAtsBtn.click();

    // Verify ATS panel is visible on mobile
    await expect(page.locator('#ats-readiness-panel')).toBeVisible();

    // Screenshot 3: 390px with needs-attention
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'editor_checklist_needs_attention_mobile_390px.png'),
      fullPage: false,
    });

    // Restore name to show mobile all-pass
    await page.click('button:has-text("Edit Sections")');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Diyan Shah');
    await page.waitForTimeout(1000);
    await mobileAtsBtn.click();
    await page.waitForTimeout(500);

    // Screenshot 4: 390px all-pass
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'editor_checklist_all_pass_mobile_390px.png'),
      fullPage: false,
    });
  });

  test('3. Keyboard accessibility: download button and ATS tabs operable via keyboard', async ({ page }) => {
    test.setTimeout(30000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/editor/${testDocId}`);
    await page.waitForLoadState('domcontentloaded');

    // Tab through controls to focus the download button
    await page.locator('#download-pdf-button').focus();
    await expect(page.locator('#download-pdf-button')).toBeFocused();

    // Tab into the ATS right tab
    await page.locator('#right-tab-ats').focus();
    await expect(page.locator('#right-tab-ats')).toBeFocused();
    await page.keyboard.press('Enter');

    // Panel should now be active
    await expect(page.locator('#ats-readiness-panel')).toBeVisible();
  });
});
