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

test.describe('Sign-out 303 redirect & session clearing (Desktop & Mobile)', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `signout-e2e-${Date.now()}@quillfolio.local`;
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
      user_metadata: { full_name: 'Signout E2E User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    await (adminClient as any).from('master_profiles').insert({
      user_id: testUserId,
      headline: 'Test Engineer',
      summary: 'Signout redirect verification.',
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

  const signInFresh = async (context: any) => {
    const freshCookies: Record<string, string> = {};
    const ssrClient = createServerClient(supabaseUrl!, anonKey!, {
      cookies: {
        getAll() {
          return Object.entries(freshCookies).map(([name, value]) => ({ name, value }));
        },
        setAll(toSet) {
          toSet.forEach((c) => {
            freshCookies[c.name] = c.value;
          });
        },
      },
    });
    const { error: signErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signErr) throw signErr;

    const cookiesToSet = Object.entries(freshCookies).map(([name, value]) => ({
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
    test(`Clicking Sign out at ${width}px uses 303 -> GET /login (200), clears cookies, and locks /dashboard`, async ({
      page,
      context,
    }) => {
      await signInFresh(context);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);

      const hops: Array<{ method: string; url: string; status: number; location: string | null }> = [];
      page.on('response', (res) => {
        const req = res.request();
        if (req.isNavigationRequest()) {
          const url = new URL(res.url()).pathname;
          hops.push({
            method: req.method(),
            url,
            status: res.status(),
            location: res.headers()['location'] || null,
          });
        }
      });

      if (width < 640) {
        const menuBtn = page.locator('button[aria-label="Toggle navigation menu"]');
        await menuBtn.click();
        const signOutBtn = page.locator('#mobile-nav-menu button[type="submit"]:has-text("Sign out")');
        await expect(signOutBtn).toBeVisible();
        await Promise.all([
          page.waitForURL(/\/login/),
          signOutBtn.click(),
        ]);
      } else {
        const signOutBtn = page.locator('header form[action="/auth/signout"] button[type="submit"]').first();
        await expect(signOutBtn).toBeVisible();
        await Promise.all([
          page.waitForURL(/\/login/),
          signOutBtn.click(),
        ]);
      }

      console.log(`[SIGNOUT_CHAIN_${width}px]`, JSON.stringify(hops));

      const signoutHop = hops.find((h) => h.url === '/auth/signout');
      expect(signoutHop, 'Expected POST /auth/signout hop').toBeDefined();
      expect(signoutHop!.method).toBe('POST');
      expect(signoutHop!.status).toBe(303);
      expect(signoutHop!.location).toMatch(/\/login$/);

      const loginHop = hops.find((h) => h.url === '/login');
      expect(loginHop, 'Expected GET /login hop').toBeDefined();
      expect(loginHop!.method).toBe('GET');
      expect(loginHop!.status).toBe(200);

      // Login form must be visible
      await expect(page.getByRole('button', { name: /Sign In|Send Magic Link/i }).first()).toBeVisible();

      // Auth cookies must be cleared
      const cookiesAfter = await context.cookies();
      const authCookies = cookiesAfter.filter((c) => c.name.includes('-auth-token') && c.value.length > 0);
      expect(authCookies).toHaveLength(0);

      // Navigating to /dashboard must redirect back to /login
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
