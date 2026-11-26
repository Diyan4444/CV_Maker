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

const ARTIFACT_DIR =
  process.env.ARTIFACT_DIR ||
  'C:\\Users\\Diyan\\.gemini\\antigravity\\brain\\0476a383-8a86-41cb-a552-ce7ab883faf8';

test.describe('Phase 8A: Public/Website Side Removal Verification & Screenshots', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `phase8a-e2e-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};

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
      user_metadata: { full_name: 'Phase 8A User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    const { error: mpErr } = await (adminClient as any).from('master_profiles').insert({
      user_id: testUserId,
      headline: 'Software Engineer',
      summary: 'Phase 8A verification.',
    });
    if (mpErr) throw mpErr;

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
    const { error: signErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signErr) throw signErr;
  });

  test.afterAll(async () => {
    if (testUserId && adminClient) {
      try {
        await adminClient.from('master_profiles').delete().eq('user_id', testUserId);
        await adminClient.auth.admin.deleteUser(testUserId);
      } catch {}
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

  for (const width of [1440, 390]) {
    test(`Verifies no public website content remains on /, /privacy, /dashboard, /onboarding @ ${width}px`, async ({
      page,
      context,
    }) => {
      const height = width === 1440 ? 900 : 844;
      await page.setViewportSize({ width, height });

      // 1. Landing page (/)
      await page.goto('/');
      await page.waitForSelector('h1');
      const landingText = await page.locator('main').innerText();
      expect(landingText).not.toContain('Personal website');
      expect(landingText).not.toContain('portfolio website');
      expect(landingText).toContain('More templates');
      expect(landingText).toContain(
        'Export your complete data as JSON at any time. Delete your account and everything is removed immediately and permanently. Data is never sold, shared with data brokers, or used to train third-party machine learning models.'
      );
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `landing_8a_${width}px.png`),
        fullPage: true,
        animations: 'disabled',
      });

      // 2. Privacy (/privacy)
      await page.goto('/privacy');
      await page.waitForSelector('h1');
      const privacyText = await page.locator('main').innerText();
      expect(privacyText).not.toContain('public site');
      expect(privacyText).not.toContain('Website Configuration');
      expect(privacyText).toContain('avatar URL');
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `privacy_8a_${width}px.png`),
        fullPage: true,
        animations: 'disabled',
      });

      // Authenticated pages
      await applyCookies(context);

      // 3. Dashboard (/dashboard)
      await page.goto('/dashboard');
      await page.waitForSelector('h1');
      const dashboardText = await page.locator('body').innerText();
      expect(dashboardText).not.toContain('Public Website');
      expect(dashboardText).not.toContain('Public Site');
      expect(dashboardText).not.toContain('Manage Website');
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `dashboard_8a_${width}px.png`),
        animations: 'disabled',
      });

      // 4. Onboarding step 1 (/onboarding)
      await page.goto('/onboarding');
      await page.waitForSelector('h1');
      const onboardingText = await page.locator('main').innerText();
      expect(onboardingText).toContain('Resume');
      expect(onboardingText).toContain('Academic CV');
      expect(onboardingText).not.toContain('Public Website');
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `onboarding_step1_8a_${width}px.png`),
        animations: 'disabled',
      });
    });
  }
});
