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

test.describe.serial('Phase 8I: PDF Worker & Main-Thread Fallback', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId = '';
  const testEmail = `phase8i-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  const capturedCookies: Record<string, string> = {};
  let docId = '';

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
      user_metadata: { full_name: 'Worker Fallback Tester' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    const { data: profileRecord, error: profErr } = await (adminClient as any)
      .from('master_profiles')
      .insert({
        user_id: testUserId,
        background_group: 'engineering_technology',
        specialization: 'Computer Science Engineering',
        headline: 'Systems Architect',
        summary: 'Worker fallback parity verification.',
      })
      .select('id')
      .single();
    if (profErr) throw profErr;

    const { data: docRec, error: docErr } = await (adminClient as any)
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Worker Parity Resume',
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        version: 1,
      })
      .select('id')
      .single();
    if (docErr) throw docErr;
    docId = docRec.id;

    await (adminClient as any).from('document_sections').insert([
      {
        document_id: docId,
        section_type: 'header',
        title: 'Header',
        order_index: 0,
        is_visible: true,
        content: {
          fullName: 'Worker Fallback Tester',
          headline: 'Systems Architect',
          email: testEmail,
          otherLinks: [],
          schema_version: '1.0.0',
        },
      },
      {
        document_id: docId,
        section_type: 'summary',
        title: 'Summary',
        order_index: 1,
        is_visible: true,
        content: {
          text: 'Verifying Web Worker compilation and main-thread fallback parity.',
          schema_version: '1.0.0',
        },
      },
    ]);

    void profileRecord;

    const ssrClient = createServerClient(supabaseUrl!, anonKey!, {
      cookies: {
        getAll: () => Object.entries(capturedCookies).map(([name, value]) => ({ name, value })),
        setAll: (list) => list.forEach(({ name, value }) => (capturedCookies[name] = value)),
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

  async function addCookies(context: any) {
    await context.addCookies(
      Object.entries(capturedCookies).map(([name, value]) => ({
        name,
        value,
        domain: 'localhost',
        path: '/',
      }))
    );
  }

  test('PDF compiles in Web Worker by default and falls back cleanly to main thread when Worker is disabled', async ({
    page,
    context,
  }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) test.skip();
    await addCookies(context);

    // 1. Default: Web Worker mode
    await page.goto(`/editor/${docId}`, { waitUntil: 'domcontentloaded' });
    const container = page.locator('#pdf-preview-canvas-container');
    await expect(container.locator('canvas').first()).toBeAttached({ timeout: 25000 });
    await expect(container).toHaveAttribute('data-compiling', 'false');
    await expect(container).toHaveAttribute('data-compile-mode', 'worker');
    const workerPageReadout = await page.locator('#preview-page-readout').textContent();

    // 2. Fallback: disable Worker before navigation
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__QUILLFOLIO_DISABLE_PDF_WORKER__ = true;
    });
    await page.goto(`/editor/${docId}`, { waitUntil: 'domcontentloaded' });
    await expect(container.locator('canvas').first()).toBeAttached({ timeout: 25000 });
    await expect(container).toHaveAttribute('data-compiling', 'false');
    await expect(container).toHaveAttribute('data-compile-mode', 'main-thread');
    const fallbackPageReadout = await page.locator('#preview-page-readout').textContent();

    expect(fallbackPageReadout).toBe(workerPageReadout);
  });
});
