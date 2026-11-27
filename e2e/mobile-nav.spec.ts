 
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

const hasCredentials = Boolean(
  supabaseUrl &&
  anonKey &&
  serviceKey &&
  !supabaseUrl.includes('placeholder')
);

const mobileViewports = [
  { name: '320px', width: 320, height: 640 },
  { name: '390px', width: 390, height: 844 },
];

test.describe.serial('Mobile Navigation Accessibility & Disclosure Audit', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `mobilenav-test-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};

  test.beforeAll(async () => {
    if (!hasCredentials) return;
    assertTestProjectRefAllowed(supabaseUrl);

    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Mobile Nav Tester' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    // Seed master profile
    await (adminClient as any).from('master_profiles').insert({
      user_id: testUserId,
      background_group: 'Engineering and Technology',
      specialization: 'Computer Science Engineering',
      headline: 'Software Engineer',
    });

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

  for (const vp of mobileViewports) {
    for (const pagePath of ['/dashboard', '/profile']) {
      test(`Mobile nav disclosure toggles and displays links on ${pagePath} at ${vp.name}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });

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
        await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        // Check mobile bottom tab bar and compact header
        const bottomNav = page.locator('nav[aria-label="Mobile Navigation"]');
        await expect(bottomNav).toBeVisible();

        const docsLink = bottomNav.locator('a[href="/dashboard"]');
        const profileLink = bottomNav.locator('a[href="/profile"]');
        const settingsLink = bottomNav.locator('a[href="/settings"]');

        await expect(docsLink).toBeVisible();
        await expect(profileLink).toBeVisible();
        await expect(settingsLink).toBeVisible();

        // Active route indicator
        if (pagePath === '/dashboard') {
          await expect(docsLink).toHaveAttribute('aria-current', 'page');
        } else if (pagePath === '/profile') {
          await expect(profileLink).toHaveAttribute('aria-current', 'page');
        }

        // Minimum 44px touch target height on bottom tab bar links
        for (const link of [docsLink, profileLink, settingsLink]) {
          const box = await link.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.height).toBeGreaterThanOrEqual(44);
        }

        // Compact top bar has New action and Sign out button
        await expect(page.locator('header a[href="/dashboard?new=1"]')).toBeVisible();
        await expect(page.locator('header button[aria-label="Sign out"]')).toBeVisible();

        await context.close();
      });
    }
  }
});
