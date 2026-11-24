import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';

test.describe.serial('NavigationProgressBar & Transition Overlay Safety Invariants', () => {
  let adminClient: any;
  let testUserId: string;
  let capturedCookies: Record<string, string> = {};
  const testEmail = `overlay-safety-${Date.now()}@quillfolio.local`;
  const testPassword = 'Password123!Secure';

  test.beforeAll(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey || !anonKey || supabaseUrl.includes('placeholder')) {
      throw new Error('Missing Supabase environment variables');
    }

    assertTestProjectRefAllowed(supabaseUrl);

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Overlay Safety User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

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

    // Create minimal master_profile
    await adminClient.from('master_profiles').insert({
      user_id: testUserId,
      background_group: 'engineering_technology',
      headline: 'Safety Verification Engineer',
      summary: 'Overlay safety audit user.',
    });
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

  /**
   * Asserts that no full-screen fixed overlay is present or intercepting pointer events.
   * Tests elementFromPoint at several coordinates across the viewport.
   */
  const assertNoBlockingOverlay = async (page: any) => {
    // Wait within 2 seconds of the final state
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(200);

    const viewport = page.viewportSize() || { width: 1440, height: 900 };
    const testPoints = [
      { x: 100, y: 100 },
      { x: Math.floor(viewport.width / 2), y: Math.floor(viewport.height / 2) },
      { x: viewport.width - 100, y: viewport.height - 100 },
    ];

    for (const pt of testPoints) {
      await expect.poll(async () => {
        try {
          return await page.evaluate(({ x, y }: { x: number; y: number }) => {
            const el = document.elementFromPoint(x, y);
            if (!el) return false;
            const overlay = el.closest('#instant-navigation-overlay, .fixed.inset-0.z-40');
            return overlay !== null;
          }, pt);
        } catch {
          return false;
        }
      }, { timeout: 2000 }).toBe(false);
    }

    // Verify overlay element is not visible or not attached
    const overlay = page.locator('#instant-navigation-overlay');
    await expect(overlay).not.toBeVisible();
  };

  // 1. Clicking a link to the current route
  test('1. Clicking link to the current route: overlay never stays up and never blocks clicks', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/dashboard');
    await page.waitForSelector('main', { timeout: 15000 });

    // Click link to current route (/dashboard)
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first();
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();

    // Assert no fixed full-screen overlay intercepts clicks within 2 seconds
    await assertNoBlockingOverlay(page);

    // Verify a button on the current page is directly clickable
    const createBtn = page.getByRole('button', { name: /Create Document/i }).first();
    if (await createBtn.isVisible()) {
      await expect(createBtn).toBeEnabled();
      await createBtn.click();
      await expect(page.getByText(/Choose Starting Point|Create Document/i).first()).toBeVisible();
      // Dismiss modal with Escape
      await page.keyboard.press('Escape');
    }
  });

  // 2. Browser back/forward during a pending navigation
  test('2. Browser back/forward during pending navigation: overlay never stays up and never blocks clicks', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Visit /dashboard first, then /profile so history has entries to navigate back to
    await page.goto('/dashboard');
    await page.waitForSelector('main', { timeout: 15000 });

    await page.goto('/profile');
    await page.waitForSelector('main', { timeout: 15000 });

    // Delay dashboard navigation
    await page.route('**/dashboard**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    // Initiate navigation to /dashboard
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first();
    await dashboardLink.click();

    // Trigger browser back while navigation is in-flight
    await page.waitForTimeout(100);
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');

    // Assert no fixed full-screen overlay intercepts clicks within 2 seconds
    await assertNoBlockingOverlay(page);

    // Page should remain interactive and valid
    await expect(page.locator('main').first()).toBeVisible();
  });

  // 3. Navigation that fails (offline) then recovers
  test('3. Navigation that fails (offline) then recovers: overlay releases clicks within 2 seconds', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/dashboard');
    await page.waitForSelector('main', { timeout: 15000 });

    // Simulate network offline
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Attempt navigation while offline
    const profileLink = page.getByRole('link', { name: 'Master Profile' }).first();
    await profileLink.click({ force: true }).catch(() => {});

    // Recover network
    await page.waitForTimeout(200);
    await context.setOffline(false);
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    // Assert no fixed full-screen overlay intercepts clicks within 2 seconds
    await assertNoBlockingOverlay(page);
  });

  // 4. Click on non-navigation anchors (blob/download, mailto, external)
  test('4. Click on non-navigation anchors: overlay never triggers or intercepts clicks', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/dashboard');
    await page.waitForSelector('main', { timeout: 15000 });

    // Inject sample non-navigation anchors and click them
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'test-non-nav-anchors';
      container.innerHTML = `
        <a id="test-blob-link" href="blob:http://localhost:3100/sample-uuid" download="sample.pdf">Blob Link</a>
        <a id="test-mailto-link" href="mailto:support@quillfolio.local">Mailto Link</a>
        <a id="test-external-link" href="https://example.com" target="_blank">External Link</a>
      `;
      document.body.appendChild(container);
    });

    await page.locator('#test-blob-link').click().catch(() => {});
    await assertNoBlockingOverlay(page);

    await page.locator('#test-mailto-link').click().catch(() => {});
    await assertNoBlockingOverlay(page);

    await page.locator('#test-external-link').click().catch(() => {});
    await assertNoBlockingOverlay(page);

    // Clean up injected test anchors
    await page.evaluate(() => {
      document.getElementById('test-non-nav-anchors')?.remove();
    });
  });

  // 5. Server error that renders error.tsx
  test('5. Server error that renders error.tsx: overlay dismisses and error UI is clickable', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/dashboard');
    await page.waitForSelector('main', { timeout: 15000 });

    // Mock /profile to return 500 server error
    await page.route('**/profile**', async (route) => {
      if (route.request().resourceType() === 'document' || route.request().headers()['rsc']) {
        await route.fulfill({
          status: 500,
          contentType: 'text/html',
          body: '<div>Internal Server Error</div>',
        });
      } else {
        await route.continue();
      }
    });

    const profileLink = page.getByRole('link', { name: 'Master Profile' }).first();
    await profileLink.click().catch(() => {});

    // Within 2 seconds of error state, overlay must not intercept clicks
    await assertNoBlockingOverlay(page);
  });

  // 6. 3 rapid navigations between different routes
  test('6. 3 rapid navigations between different routes: settles cleanly with no blocking overlay', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/dashboard');
    await page.waitForSelector('main', { timeout: 15000 });

    // Rapidly click between available navigation links
    const profileLink = page.getByRole('link', { name: 'Master Profile' }).first();
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first();

    await profileLink.click();
    await page.waitForTimeout(50);
    await dashboardLink.click();
    await page.waitForTimeout(50);
    await profileLink.click();

    // Wait for the final route to settle
    await page.waitForSelector('main', { timeout: 15000 });

    // Assert no fixed full-screen overlay intercepts clicks within 2 seconds of final state
    await assertNoBlockingOverlay(page);
  });
});
