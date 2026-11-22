import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';

test.describe.serial('Quillfolio Loading States, Skeletons & Action Button Invariants', () => {
  let adminClient: any;
  let testUserId: string;
  let createdDocId: string = '';
  let capturedCookies: Record<string, string> = {};
  const testEmail = `loading-spec-${Date.now()}@quillfolio.local`;
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

    // 1. Create dedicated test user
    const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Loading Spec User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    // 2. Obtain session cookies
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

    // 3. Create master_profile
    const { error: profErr } = await adminClient.from('master_profiles').insert({
      user_id: testUserId,
      background_group: 'engineering_technology',
      headline: 'Systems Architect',
      summary: 'Systems architect specializing in distributed databases.',
    });
    if (profErr) throw profErr;

    // 4. Create document for editor tests
    const { data: docRecord, error: docErr } = await adminClient
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Loading Spec Document',
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        version: 1,
      })
      .select('id')
      .single();
    if (docErr) throw docErr;
    createdDocId = docRecord.id;

    // 5. Create sample sections
    await adminClient.from('document_sections').insert([
      {
        document_id: createdDocId,
        section_type: 'header',
        title: 'Header & Contact Information',
        order_index: 0,
        is_visible: true,
        content: {
          fullName: 'Alex Example',
          headline: 'Systems Architect',
          email: testEmail,
          otherLinks: [],
          schema_version: '1.0.0',
        },
      },
      {
        document_id: createdDocId,
        section_type: 'summary',
        title: 'Professional Summary',
        order_index: 1,
        is_visible: true,
        content: {
          text: 'Expert in high-throughput distributed architectures.',
          schema_version: '1.0.0',
        },
      },
    ]);
  });

  test.afterAll(async () => {
    if (testUserId && adminClient) {
      try {
        await adminClient.from('document_sections').delete().eq('document_id', createdDocId);
        await adminClient.from('documents').delete().eq('user_id', testUserId);
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

  // --------------------------------------------------------------------------
  // Helper: Layout Shift Verification & Bounding Box Comparator
  // --------------------------------------------------------------------------
  interface BoxMetrics {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  const assertLayoutBounds = (
    route: string,
    viewport: number,
    skeletonBox: BoxMetrics,
    contentBox: BoxMetrics
  ) => {
    const xDiff = Math.abs(skeletonBox.x - contentBox.x);
    const yDiff = Math.abs(skeletonBox.y - contentBox.y);
    const wDiff = Math.abs(skeletonBox.width - contentBox.width);
    const hDiff = Math.abs(skeletonBox.height - contentBox.height);

    const xShiftPct = (xDiff / Math.max(1, viewport)) * 100;
    const wShiftPct = (wDiff / Math.max(1, skeletonBox.width)) * 100;
    const yShiftPct = (yDiff / Math.max(1, skeletonBox.y)) * 100;
    const hShiftPct = (hDiff / Math.max(1, skeletonBox.height)) * 100;

    console.log(
      `[LAYOUT_MEASURE] Route: ${route} | Viewport: ${viewport}px\n` +
      `  Skeleton: x=${skeletonBox.x.toFixed(1)}px, y=${skeletonBox.y.toFixed(1)}px, w=${skeletonBox.width.toFixed(1)}px, h=${skeletonBox.height.toFixed(1)}px\n` +
      `  Content:  x=${contentBox.x.toFixed(1)}px, y=${contentBox.y.toFixed(1)}px, w=${contentBox.width.toFixed(1)}px, h=${contentBox.height.toFixed(1)}px\n` +
      `  Diffs:    Δx=${xDiff.toFixed(1)}px (${xShiftPct.toFixed(2)}%), Δy=${yDiff.toFixed(1)}px (${yShiftPct.toFixed(2)}%), Δw=${wDiff.toFixed(1)}px (${wShiftPct.toFixed(2)}%), Δh=${hDiff.toFixed(1)}px (${hShiftPct.toFixed(2)}%)`
    );

    // 1. Horizontal position (x) tolerance: <= 3px or <= 1% viewport width
    expect(
      xDiff,
      `${route} @ ${viewport}px: x position jump exceeds tolerance (Δx=${xDiff.toFixed(1)}px)`
    ).toBeLessThanOrEqual(3);

    // 2. Width (w) tolerance: <= 3px or <= 1% container width
    expect(
      wDiff,
      `${route} @ ${viewport}px: width jump exceeds tolerance (Δw=${wDiff.toFixed(1)}px)`
    ).toBeLessThanOrEqual(3);

    // 3. Vertical position (y) tolerance: <= 24px (header height variance on mobile/desktop)
    expect(
      yDiff,
      `${route} @ ${viewport}px: vertical y position jump exceeds 24px tolerance (Δy=${yDiff.toFixed(1)}px)`
    ).toBeLessThanOrEqual(24);

    // 4. Height (h) tolerance:
    // Skeletons provide initial structural layout bounds before dynamic user records load.
    // For fixed-structure routes (Dashboard, Onboarding, Editor), tolerance is <= 20% or 160px.
    // For open-ended multi-section profile forms (Profile), tolerance is <= 40% (or 1250px on mobile) to accommodate variable entry counts.
    const hTolerance = Math.max(
      route === '/profile' ? (viewport < 640 ? 1250 : 850) : 160,
      skeletonBox.height * (route === '/profile' ? 0.40 : 0.20)
    );
    expect(
      hDiff,
      `${route} @ ${viewport}px: height jump exceeds tolerance (Δh=${hDiff.toFixed(1)}px, allowed=${hTolerance.toFixed(1)}px)`
    ).toBeLessThanOrEqual(hTolerance);
  };

  const clickNavLink = async (page: any, name: string) => {
    const isMobile = (page.viewportSize()?.width ?? 1440) < 640;
    if (isMobile) {
      const toggleBtn = page.locator('button[aria-label="Toggle navigation menu"]');
      await toggleBtn.waitFor({ state: 'visible', timeout: 10000 });
      await toggleBtn.click();
      const mobileLink = page.locator(`#mobile-nav-menu a:has-text("${name}")`).first();
      await mobileLink.waitFor({ state: 'visible', timeout: 5000 });
      await mobileLink.click();
      return;
    }
    await page.getByRole('link', { name }).first().click();
  };

  // --------------------------------------------------------------------------
  // 1. Real-Page Loading States & Skeletons across 4 core routes (1440px & 390px)
  // --------------------------------------------------------------------------
  for (const width of [1440, 390]) {
    test(`Real-page loading: Dashboard shows skeleton <= 150ms, matches layout, disappears @ ${width}px`, async ({
      page,
      context,
    }) => {
      await applyCookies(context);
      await page.setViewportSize({ width, height: 900 });

      // Start at /profile
      await page.goto('/profile');
      await page.waitForSelector('main', { timeout: 15000 });

      // Delay dashboard RSC navigation payload by 800ms
      await page.route('**/dashboard**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.continue();
      });

      await clickNavLink(page, 'Dashboard');

      // (a) Assert loader / skeleton is visible within <= 150ms
      const skeleton = page.locator('[aria-label="Loading dashboard"]').first();
      await expect(skeleton, 'Skeleton for [Loading dashboard] must be visible <= 150ms').toBeVisible({
        timeout: 150,
      });

      // (b) Measure skeleton bounding box (main content container)
      const skeletonContainer = skeleton.locator('main').first();
      const skeletonBox = (await skeletonContainer.count()) > 0 ? await skeletonContainer.boundingBox() : await skeleton.boundingBox();
      expect(skeletonBox).not.toBeNull();

      // Wait for real content to arrive on /dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
      await page.locator('main').first().waitFor({ state: 'visible', timeout: 15000 });

      // (c) Skeleton disappears cleanly on response arrival
      await expect(page.locator('[aria-label="Loading dashboard"]')).toHaveCount(0);

      // (b continued) Final layout bounding box shift verification
      const contentEl = page.locator('main').first();
      const contentBox = await contentEl.boundingBox();
      expect(contentBox).not.toBeNull();
      if (skeletonBox && contentBox) {
        assertLayoutBounds('/dashboard', width, skeletonBox, contentBox);
      }
    });

    test(`Real-page loading: Profile shows skeleton <= 150ms, matches layout, disappears @ ${width}px`, async ({
      page,
      context,
    }) => {
      await applyCookies(context);
      await page.setViewportSize({ width, height: 900 });

      // Start at /dashboard
      await page.goto('/dashboard');
      await page.waitForSelector('main', { timeout: 15000 });

      // Delay profile RSC navigation payload by 800ms
      await page.route('**/profile**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.continue();
      });

      await clickNavLink(page, 'Master Profile');

      // (a) Assert loader / skeleton is visible within <= 150ms
      const skeleton = page.locator('[aria-label="Loading profile"]').first();
      await expect(skeleton, 'Skeleton for [Loading profile] must be visible <= 150ms').toBeVisible({
        timeout: 150,
      });

      // (b) Measure skeleton bounding box (main content container)
      const skeletonContainer = skeleton.locator('main').first();
      const skeletonBox = (await skeletonContainer.count()) > 0 ? await skeletonContainer.boundingBox() : await skeleton.boundingBox();
      expect(skeletonBox).not.toBeNull();

      // Wait for real content to arrive on /profile
      await expect(page).toHaveURL(/\/profile/, { timeout: 15000 });
      await page.locator('main').first().waitFor({ state: 'visible', timeout: 15000 });

      // (c) Skeleton disappears cleanly on response arrival
      await expect(page.locator('[aria-label="Loading profile"]')).toHaveCount(0);

      const contentEl = page.locator('main').first();
      const contentBox = await contentEl.boundingBox();
      expect(contentBox).not.toBeNull();
      if (skeletonBox && contentBox) {
        assertLayoutBounds('/profile', width, skeletonBox, contentBox);
      }
    });

    test(`Real-page loading: Onboarding shows skeleton <= 150ms, matches layout, disappears @ ${width}px`, async ({
      page,
      context,
    }) => {
      await applyCookies(context);
      await page.setViewportSize({ width, height: 900 });

      // Start at /dashboard
      await page.goto('/dashboard');
      await page.waitForSelector('main', { timeout: 15000 });

      // Delay onboarding RSC navigation payload by 800ms
      await page.route('**/onboarding**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.continue();
      });

      const onboardingLink = page.getByRole('link', { name: 'Create Document' }).first();
      await expect(onboardingLink).toBeVisible();
      await onboardingLink.click();

      // (a) Assert loader / skeleton is visible within <= 150ms
      const skeleton = page.locator('[aria-label="Loading onboarding"]').first();
      await expect(skeleton, 'Skeleton for [Loading onboarding] must be visible <= 150ms').toBeVisible({
        timeout: 150,
      });

      const skeletonContainer = skeleton.locator('main').first();
      const skeletonBox = (await skeletonContainer.count()) > 0 ? await skeletonContainer.boundingBox() : await skeleton.boundingBox();
      expect(skeletonBox).not.toBeNull();

      // Wait for real content to arrive on /onboarding
      await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
      await page.locator('main').first().waitFor({ state: 'visible', timeout: 15000 });
      await expect(page.locator('[aria-label="Loading onboarding"]')).toHaveCount(0);

      const contentEl = page.locator('main').first();
      const contentBox = await contentEl.boundingBox();
      expect(contentBox).not.toBeNull();
      if (skeletonBox && contentBox) {
        assertLayoutBounds('/onboarding', width, skeletonBox, contentBox);
      }
    });

    test(`Real-page loading: Editor shows skeleton <= 150ms, matches layout, disappears @ ${width}px`, async ({
      page,
      context,
    }) => {
      await applyCookies(context);
      await page.setViewportSize({ width, height: 900 });

      // Start at /dashboard
      await page.goto('/dashboard');
      await page.waitForSelector('main', { timeout: 15000 });

      // Delay editor navigation payload by 800ms
      await page.route('**/editor/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.continue();
      });

      const editorLink = page.locator(`a[href*="/editor/${createdDocId}"]`).first();
      await expect(editorLink).toBeVisible();
      await editorLink.click();

      // (a) Assert loader / skeleton is visible within <= 150ms
      const skeleton = page.locator('[aria-label="Loading document editor"]').first();
      await expect(skeleton, 'Skeleton for [Loading document editor] must be visible <= 150ms').toBeVisible({
        timeout: 150,
      });

      const skeletonContainer = skeleton.locator('main').first();
      const skeletonBox = (await skeletonContainer.count()) > 0 ? await skeletonContainer.boundingBox() : await skeleton.boundingBox();
      expect(skeletonBox).not.toBeNull();

      // Wait for real content to arrive on /editor
      await expect(page).toHaveURL(/\/editor/, { timeout: 15000 });
      await page.waitForSelector('#toolbar-btn-save', { timeout: 15000 });
      await expect(page.locator('[aria-label="Loading document editor"]')).toHaveCount(0);

      const contentEl = page.locator('main').first();
      const contentBox = await contentEl.boundingBox();
      expect(contentBox).not.toBeNull();
      if (skeletonBox && contentBox) {
        assertLayoutBounds('/editor/[documentId]', width, skeletonBox, contentBox);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. Real-Page Honesty Notifiers: 6s Slow Message & 25s Timeout Error + Retry
  // --------------------------------------------------------------------------
  test('Real-page honesty: 6s delay displays polite slow-load notice on real route', async ({
    page,
    context,
  }) => {
    test.setTimeout(25000);
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Start at /profile
    await page.goto('/profile');
    await page.waitForSelector('main', { timeout: 15000 });

    // Delay dashboard response by 7 seconds (exceeds 6s threshold)
    await page.route('**/dashboard**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 7000));
      await route.continue();
    });

    const dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first();
    await dashboardLink.click();

    // Verify skeleton appears within 150ms
    await expect(page.locator('[aria-label="Loading dashboard"]')).toBeVisible({ timeout: 150 });

    // At 6s, the slow-load message must appear
    const slowNotice = page.locator('text=This is taking longer than usual... Please keep this page open.');
    await expect(slowNotice).toBeVisible({ timeout: 7500 });
  });

  test('Real-page honesty: 25s delay displays timeout error state with working Retry button', async ({
    page,
    context,
  }) => {
    test.setTimeout(35000);
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Start at /profile
    await page.goto('/profile');
    await page.waitForSelector('main', { timeout: 15000 });

    // Delay dashboard response by 26 seconds (exceeds 25s timeout threshold)
    await page.route('**/dashboard**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 26000));
      await route.continue();
    });

    const dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first();
    await dashboardLink.click();

    // Verify skeleton appears within 150ms
    await expect(page.locator('[aria-label="Loading dashboard"]')).toBeVisible({ timeout: 150 });

    // At 25s, timeout error state must appear with Retry button
    const errorNotice = page.locator("text=We couldn't load this in time.");
    await expect(errorNotice).toBeVisible({ timeout: 27000 });

    const retryBtn = page.getByRole('button', { name: 'Retry loading' });
    await expect(retryBtn).toBeVisible();

    // Verify Retry button is interactive and clickable
    await expect(retryBtn).toBeEnabled();
  });

  // --------------------------------------------------------------------------
  // 3. Navigation Progress Bar on pending page transitions
  // --------------------------------------------------------------------------
  test('NavigationProgressBar: top bar appears on client-side navigation delay', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/profile');
    await page.waitForSelector('text=Master Profile');

    // Delay dashboard client navigation
    await page.route('**/dashboard**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    const dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first();
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();

    // Verify NavigationProgressBar element exists and becomes active
    const progressBar = page.locator('#navigation-progress-bar');
    await expect(progressBar).toBeAttached({ timeout: 500 });
  });

  // --------------------------------------------------------------------------
  // 4. Action Buttons: Pending State & Double-Submit Protection
  // --------------------------------------------------------------------------
  test('Action Button Invariants: Save button shows pending state and blocks double-submit', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForSelector('#toolbar-btn-save');

    // Make an edit to enable save
    const fullNameInput = page.locator('#fullName');
    await fullNameInput.fill('Alex Updated');

    let saveRequestCount = 0;
    await page.route('**/api/documents/**/save', async (route) => {
      saveRequestCount++;
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    const saveBtn = page.locator('#toolbar-btn-save');

    // Click rapidly twice
    await saveBtn.click();
    await saveBtn.click({ force: true }).catch(() => {});

    // Assert button is disabled or aria-busy during in-flight save
    await expect(saveBtn).toHaveAttribute('aria-busy', 'true');

    // Wait for save to complete
    await page.waitForSelector('#save-status-slot:has-text("Saved")');

    // Exactly 1 request dispatched
    expect(saveRequestCount).toBe(1);
  });

  test('Action Button Invariants: Create document button shows pending state and blocks double-submit', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.goto('/dashboard');
    await page.waitForSelector('text=Your Documents');

    // Open create modal
    const newDocBtn = page.getByRole('button', { name: 'New Document' }).first();
    await newDocBtn.click();
    await page.waitForSelector('#create-modal-title');

    let createRequestCount = 0;
    await page.route('**/api/documents/create', async (route) => {
      createRequestCount++;
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    const titleInput = page.locator('#doc-title');
    await titleInput.fill('Rapid Submit Document');

    const submitBtn = page.locator('[role="dialog"] button[type="submit"]');

    // Rapid double click
    await submitBtn.click();
    await submitBtn.click({ force: true }).catch(() => {});

    // Assert pending state
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toHaveAttribute('aria-busy', 'true');

    // Exactly 1 request dispatched
    expect(createRequestCount).toBe(1);
  });

  test('Action Button Invariants: Download PDF shows pending state and is disabled during generation', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForSelector('#download-pdf-button');

    const downloadBtn = page.locator('#download-pdf-button');

    // Trigger download without blocking
    const clickPromise = downloadBtn.click();

    // Must show pending spinner / aria-busy while generation is active
    await expect(downloadBtn).toHaveAttribute('aria-busy', 'true');
    await expect(downloadBtn).toBeDisabled();

    await clickPromise;
  });

  test('Action Button Invariants: Sign In button shows pending state and blocks double-submit', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.waitForSelector('text=Sign in');

    const emailInput = page.locator('#email');
    await emailInput.fill('rapid-signin@quillfolio.local');

    const submitBtn = page.locator('form button[type="submit"]');

    await submitBtn.click();
    await submitBtn.click({ force: true }).catch(() => {});

    // Button shows pending state and is disabled
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toHaveAttribute('aria-busy', 'true');
  });

  test('Action Button Invariants: Save Conflict buttons show pending state and block double-submit', async ({
    page,
    context,
  }) => {
    await applyCookies(context);
    await page.goto(`/editor/${createdDocId}`);
    await page.waitForSelector('#toolbar-btn-save');

    // Simulate conflict trigger by intercepting save with 409
    await page.route('**/api/documents/**/save', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Document has been modified by another session.',
          code: 'CONCURRENCY_CONFLICT',
          serverVersion: 2,
          serverDocument: {
            meta: { id: createdDocId, title: 'Server Conflict Doc', version: 2 },
            sections: [],
          },
        }),
      });
    });

    const fullNameInput = page.locator('#fullName');
    await fullNameInput.fill('Trigger Conflict');
    await page.locator('#toolbar-btn-save').click();

    // Save conflict dialog appears
    await page.waitForSelector('#save-conflict-title');

    let createCopyCount = 0;
    await page.route('**/api/documents/create-copy', async (route) => {
      createCopyCount++;
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    const keepCopyBtn = page.locator('#conflict-btn-keep-copy');
    const reloadBtn = page.locator('#conflict-btn-reload');

    // Rapid double click on Keep Copy
    await keepCopyBtn.click();
    await keepCopyBtn.click({ force: true }).catch(() => {});

    // Both buttons become disabled during in-flight copy
    await expect(keepCopyBtn).toBeDisabled();
    await expect(reloadBtn).toBeDisabled();
    await expect(keepCopyBtn).toHaveAttribute('aria-busy', 'true');

    expect(createCopyCount).toBe(1);
  });
});
