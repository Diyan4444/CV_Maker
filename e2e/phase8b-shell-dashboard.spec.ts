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

test.describe.serial('Phase 8B: Warm Tokens, AppShell, Documents-First Dashboard & Document Status', () => {
  let adminClient: any;
  let testUserId: string;
  const testEmail = `phase8b-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};
  const createdDocIds: string[] = [];

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
      user_metadata: { full_name: 'Phase 8B Tester' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    // Seed master profile + real facts for section count verification
    const { data: profData, error: profErr } = await adminClient
      .from('master_profiles')
      .insert({
        user_id: testUserId,
        background_group: 'engineering_technology',
        specialization: 'Computer Science Engineering',
        headline: 'Staff Systems Engineer',
        summary: 'Distributed systems engineer.',
      })
      .select('id')
      .single();
    if (profErr) throw profErr;
    const profileId = profData.id;

    const { error: eduErr } = await adminClient.from('education').insert([
      { profile_id: profileId, institution: 'MIT', degree: 'B.S.', field_of_study: 'CS', start_date: '2016-09', end_date: '2020-05' },
    ]);
    if (eduErr) throw eduErr;

    const { error: expErr } = await adminClient.from('experiences').insert([
      { profile_id: profileId, type: 'job', organization: 'Acme', role: 'Engineer', start_date: '2020-06', is_current: true },
      { profile_id: profileId, type: 'internship', organization: 'Beta', role: 'Intern', start_date: '2019-06', end_date: '2019-08', is_current: false },
    ]);
    if (expErr) throw expErr;

    const { error: sklErr } = await adminClient.from('skills').insert([
      { profile_id: profileId, category: 'Languages', items: [{ name: 'TypeScript', proficiency: 'Expert' }] },
      { profile_id: profileId, category: 'Systems', items: [{ name: 'PostgreSQL', proficiency: 'Expert' }] },
      { profile_id: profileId, category: 'Cloud', items: [{ name: 'Docker', proficiency: 'Expert' }] },
    ]);
    if (sklErr) throw sklErr;

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

    const { error: signInErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInErr) throw signInErr;
  });

  test.afterAll(async () => {
    if (adminClient && testUserId) {
      try {
        await adminClient.from('documents').delete().eq('user_id', testUserId);
        await adminClient.from('master_profiles').delete().eq('user_id', testUserId);
        await adminClient.auth.admin.deleteUser(testUserId);
      } catch {
        // ignore cleanup errors
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

  test('1. Dashboard empty state (0 docs) + real master profile counts + screenshots', async ({ page, context }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');

    await expect(page.locator('h1')).toContainText('Documents');
    await expect(page.getByText('0 of 20')).toBeVisible();
    await expect(page.getByText('No documents yet')).toBeVisible();

    // Verify real master-profile section counts (1 Edu, 2 Exp, 0 Proj, 3 Skills, 0 Pubs, 0 Certs)
    const profileStrip = page.locator('section[aria-labelledby="master-profile-summary-heading"]');
    await expect(profileStrip).toBeVisible();
    await expect(profileStrip.getByText('Education')).toBeVisible();
    await expect(profileStrip.locator('text=1').first()).toBeVisible();
    await expect(profileStrip.locator('text=2').first()).toBeVisible();
    await expect(profileStrip.locator('text=3').first()).toBeVisible();

    await page.screenshot({ path: shotPath('phase8b_dashboard_0docs_1440px.png'), fullPage: false });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: shotPath('phase8b_dashboard_0docs_390px.png'), fullPage: false });
  });

  test('2. 1-doc dashboard + sidebar collapse (232px -> 72px) persists across reload', async ({ page, context }) => {
    const { data: doc1, error } = await adminClient
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Backend Platform Resume',
        type: 'resume',
        template_id: 'ats_single_column',
        target_role: 'Senior Backend Engineer',
        status: 'draft',
        accent_color: '#800021',
        version: 1,
      })
      .select('id')
      .single();
    if (error) throw error;
    createdDocIds.push(doc1.id);

    await adminClient.from('document_sections').insert([
      {
        document_id: doc1.id,
        section_type: 'header',
        title: 'Header',
        order_index: 0,
        is_visible: true,
        content: { fullName: 'Phase 8B Tester', email: testEmail, otherLinks: [], schema_version: '1.0.0' },
      },
    ]);

    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');

    await expect(page.getByText('1 of 20')).toBeVisible();
    await expect(page.getByText('Backend Platform Resume')).toBeVisible();

    // Check sidebar initial width (232px)
    const aside = page.locator('aside[aria-label="Workspace sidebar"]');
    await expect(aside).toBeVisible();
    const initialBox = await aside.boundingBox();
    expect(Math.round(initialBox!.width)).toBe(232);

    await page.screenshot({ path: shotPath('phase8b_dashboard_1doc_1440px.png'), fullPage: false });

    // Collapse sidebar -> 72px
    const collapseBtn = page.locator('button[aria-label="Collapse sidebar"]');
    await collapseBtn.click();
    await page.waitForTimeout(250);

    const collapsedBox = await aside.boundingBox();
    expect(Math.round(collapsedBox!.width)).toBe(72);
    await expect(aside).toHaveAttribute('data-collapsed', 'true');

    await page.screenshot({ path: shotPath('phase8b_sidebar_collapsed_1440px.png'), fullPage: false });

    // Reload and verify localStorage persistence
    await page.reload();
    await expect(aside).toHaveAttribute('data-collapsed', 'true');
    const reloadedBox = await aside.boundingBox();
    expect(Math.round(reloadedBox!.width)).toBe(72);

    // Expand back so later tests start expanded
    await page.locator('button[aria-label="Expand sidebar"]').click();
    await page.waitForTimeout(200);
    await expect(aside).toHaveAttribute('data-collapsed', 'false');
  });

  test('3. 8-doc dashboard: search, status filter, row status toggle + persistence, editor toolbar status picker', async ({ page, context }) => {
    const extraDocs = [
      { title: 'Frontend Staff Resume', type: 'resume', template_id: 'modern_professional', target_role: 'Staff Frontend', status: 'ready' },
      { title: 'Academic Research CV', type: 'cv', template_id: 'academic_cv', target_role: 'Postdoc Fellow', status: 'draft' },
      { title: 'Distributed Systems Resume', type: 'resume', template_id: 'ats_single_column', target_role: 'Principal Engineer', status: 'ready' },
      { title: 'ML Infrastructure Resume', type: 'resume', template_id: 'ats_single_column', target_role: 'ML Systems', status: 'draft' },
      { title: 'Cloud Security Resume', type: 'resume', template_id: 'modern_professional', target_role: 'Security Architect', status: 'draft' },
      { title: 'Faculty Application CV', type: 'cv', template_id: 'academic_cv', target_role: 'Assistant Professor', status: 'ready' },
      { title: 'Startup Founding Engineer', type: 'resume', template_id: 'ats_single_column', target_role: 'Founding Engineer', status: 'draft' },
    ];

    for (const d of extraDocs) {
      const { data, error } = await adminClient
        .from('documents')
        .insert({
          user_id: testUserId,
          title: d.title,
          type: d.type,
          template_id: d.template_id,
          target_role: d.target_role,
          status: d.status,
          accent_color: '#800021',
          version: 1,
        })
        .select('id')
        .single();
      if (error) throw error;
      createdDocIds.push(data.id);
    }

    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');

    await expect(page.getByText('8 of 20')).toBeVisible();
    await page.screenshot({ path: shotPath('phase8b_dashboard_8docs_1440px.png'), fullPage: false });

    // Mobile 390px screenshot with bottom tab bar
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: shotPath('phase8b_dashboard_8docs_390px.png'), fullPage: false });
    await page.setViewportSize({ width: 1440, height: 900 });

    // Search filter
    const searchInput = page.locator('input[aria-label="Search documents"]');
    await searchInput.fill('Academic Research');
    await expect(page.locator('[role="listitem"]')).toHaveCount(1);
    await expect(page.getByText('Academic Research CV')).toBeVisible();
    await searchInput.fill('');

    // Status filter -> Ready (should match 3 seeded ready docs)
    const statusSelect = page.locator('select[aria-label="Filter by status"]');
    await statusSelect.selectOption('ready');
    await expect(page.locator('[role="listitem"]')).toHaveCount(3);
    await statusSelect.selectOption('all');
    await expect(page.locator('[role="listitem"]')).toHaveCount(8);

    // Toggle first doc ("Backend Platform Resume") from Draft -> Ready via row menu
    const targetDocId = createdDocIds[0];
    const row = page.locator(`[data-doc-row="${targetDocId}"]`);
    await expect(row.locator('[data-status-pill="draft"]')).toBeVisible();

    await row.locator('button[aria-label="Actions for Backend Platform Resume"]').click();
    await page.getByRole('menuitem', { name: 'Mark as Ready' }).click();
    await expect(row.locator('[data-status-pill="ready"]')).toBeVisible({ timeout: 10000 });

    // Reload and confirm Ready persisted
    await page.reload();
    await expect(page.locator(`[data-doc-row="${targetDocId}"] [data-status-pill="ready"]`)).toBeVisible();

    // Open in editor and change Ready -> Draft via toolbar status picker
    await page.goto(`/editor/${targetDocId}`);
    const picker = page.locator('#document-status-picker');
    await expect(picker).toHaveValue('ready');
    await picker.selectOption('draft');
    const saveBtn = page.getByRole('button', { name: /^Save$/i }).first();
    const [saveRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/documents/${targetDocId}/save`) && res.request().method() === 'PUT'),
      saveBtn.click(),
    ]);
    expect(saveRes.status()).toBe(200);

    // Return to dashboard and verify Draft persisted
    await page.goto('/dashboard');
    await expect(page.locator(`[data-doc-row="${targetDocId}"] [data-status-pill="draft"]`)).toBeVisible();
  });

  test('4. /dev/design gallery screenshots in animated and warm background modes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dev/design');

    await expect(page.locator('h1')).toContainText('Phase 8B Warm Design Gallery');
    await page.screenshot({ path: shotPath('phase8b_dev_design_animated_1440px.png'), fullPage: false });

    await page.getByRole('button', { name: 'Warm Solid' }).click();
    await expect(page.locator('[data-colorfield-warm-bg]')).toBeVisible();
    await page.screenshot({ path: shotPath('phase8b_dev_design_warm_1440px.png'), fullPage: false });
  });
});
