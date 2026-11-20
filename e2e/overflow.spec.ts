 
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCredentials = Boolean(
  supabaseUrl &&
  anonKey &&
  serviceKey &&
  !supabaseUrl.includes('placeholder')
);

const viewports = [
  { name: '320px', width: 320, height: 640 },
  { name: '360px', width: 360, height: 740 },
  { name: '390px', width: 390, height: 844 },
  { name: '1440px', width: 1440, height: 900 },
];

const pages = ['/', '/login', '/onboarding', '/dashboard', '/profile'] as const;

test.describe.serial('Horizontal Overflow Audit across Viewports', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  let testDocId: string = '';
  const testEmail = `overflow-test-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};

  test.beforeAll(async () => {
    if (!hasCredentials) return;

    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create temporary user with confirmed email
    const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Overflow Audit User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    // Seed master profile so dashboard and profile load complete UI
    await (adminClient as any).from('master_profiles').insert({
      user_id: testUserId,
      background_group: 'Engineering and Technology',
      specialization: 'Computer Science Engineering',
      headline: 'Software Engineering Graduate',
      summary: 'Comprehensive profile summary to populate page UI for overflow auditing.',
    });

    // Seed test document for /editor/[documentId] audit
    const { data: docRecord } = await (adminClient as any).from('documents').insert({
      user_id: testUserId,
      title: 'Overflow Audit Document',
      type: 'resume',
      template_id: 'ats_single_column',
      accent_color: '#0B0B0B',
      version: 1,
    }).select('id').single();
    testDocId = docRecord.id;

    await (adminClient as any).from('document_sections').insert({
      document_id: testDocId,
      section_type: 'header',
      title: 'Header',
      order_index: 0,
      content: { fullName: 'Overflow User', email: 'test@example.com' },
    });

    // Generate SSR authentication cookies
    capturedCookies = {};
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
  });

  test.afterAll(async () => {
    if (adminClient && testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  for (const vp of viewports) {
    test(`Viewport ${vp.name} [${vp.width}px] has zero horizontal overflow across all pages`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });

      // Inject SSR cookies
      const cookieEntries = Object.entries(capturedCookies).map(([name, value]) => ({
        name,
        value,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      }));
      if (cookieEntries.length > 0) {
        await context.addCookies(cookieEntries);
      }

      const page = await context.newPage();

      const allPages = [...pages, `/editor/${testDocId}`];
      for (const pagePath of allPages) {
        await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(100);

        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));

        expect(
          scrollWidth,
          `Overflow detected on ${pagePath} at ${vp.name}: scrollWidth (${scrollWidth}px) exceeds innerWidth (${innerWidth}px)`
        ).toBeLessThanOrEqual(innerWidth);

        // Also test ATS Readiness Panel view for horizontal overflow
        if (pagePath.startsWith('/editor/')) {
          const atsBtn = page.locator('#right-tab-ats, #mobile-ats-tab-btn').filter({ hasText: /ATS/i }).first();
          if (await atsBtn.isVisible()) {
            await atsBtn.click();
            await page.waitForTimeout(100);
            const atsOverflow = await page.evaluate(() => ({
              scrollWidth: document.documentElement.scrollWidth,
              innerWidth: window.innerWidth,
            }));
            expect(
              atsOverflow.scrollWidth,
              `Overflow detected on ATS Panel at ${vp.name}: scrollWidth (${atsOverflow.scrollWidth}px) exceeds innerWidth (${atsOverflow.innerWidth}px)`
            ).toBeLessThanOrEqual(atsOverflow.innerWidth);
          }
        }
      }

      await context.close();
    });
  }
});
