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

test.describe.serial('Bug 2: Mobile Controls Clipping & Touch Targets', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `clipping-test-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  let capturedCookies: Record<string, string> = {};
  let docId: string = '';

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
      user_metadata: { full_name: 'Clipping Test User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

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

    const { error: signInErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInErr) throw signInErr;

    // Create document with 2+ entries in Experience and multiple sections
    const { data: docRecord, error: docErr } = await (adminClient as any)
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Mobile Clipping Verification CV',
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        version: 1,
      })
      .select('id')
      .single();
    if (docErr) throw docErr;
    docId = docRecord.id;

    const sections = [
      {
        document_id: docId,
        section_type: 'header',
        title: 'Contact Information',
        order_index: 0,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          fullName: 'Alex Example',
          email: 'alex@example.com',
          phone: '+1 555-0100',
          city: 'Metropolis',
          country: 'United States',
          headline: 'Principal Systems Architect',
        },
      },
      {
        document_id: docId,
        section_type: 'summary',
        title: 'Executive Summary',
        order_index: 1,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          text: 'Expert in fault-tolerant distributed consensus algorithms.',
        },
      },
      {
        document_id: docId,
        section_type: 'experience',
        title: 'Experience',
        order_index: 2,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'a1111111-1111-4111-8111-111111111111',
              type: 'work',
              role: 'Staff Infrastructure Engineer',
              organization: 'Global Systems LLC',
              startDate: '2021-01',
              endDate: 'Present',
              bullets: ['Architected low-latency message streaming layer.'],
            },
            {
              id: 'a2222222-2222-4222-8222-222222222222',
              type: 'work',
              role: 'Senior Cloud Engineer',
              organization: 'Distributed Labs',
              startDate: '2018-05',
              endDate: '2020-12',
              bullets: ['Optimized Raft consensus throughput across edge regions.'],
            },
          ],
        },
      },
      {
        document_id: docId,
        section_type: 'skills',
        title: 'Skills',
        order_index: 3,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'c1111111-1111-4111-8111-111111111111',
              category: 'Core Technologies',
              items: [{ name: 'Rust' }, { name: 'Go' }, { name: 'TypeScript' }],
            },
          ],
        },
      },
    ];

    for (const sec of sections) {
      await (adminClient as any).from('document_sections').insert(sec);
    }
  });

  test.afterAll(async () => {
    if (adminClient && testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  const applyAuthCookies = async (context: any) => {
    const cookiesToAdd = Object.entries(capturedCookies).map(([name, value]) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    }));
    await context.addCookies(cookiesToAdd);
  };

  const checkClippingAndTouchTargets = async (page: any, viewportWidth: number) => {
    const isMobile = viewportWidth < 640;

    const auditResults = await page.evaluate((isMob: boolean) => {
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, a[href], input:not([type="hidden"]), select, textarea'
        )
      );

      const violations: Array<{
        selector: string;
        label: string;
        box: { x: number; y: number; width: number; height: number };
        reason: string;
      }> = [];

      for (const el of controls) {
        // Skip hidden elements (display: none or invisible)
        if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) {
          continue;
        }

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const label =
          el.getAttribute('aria-label') ||
          el.getAttribute('title') ||
          el.innerText?.trim() ||
          el.getAttribute('name') ||
          el.getAttribute('id') ||
          el.tagName.toLowerCase();

        // Check 1: Horizontal viewport bounds
        if (rect.left < 0 || rect.right > window.innerWidth + 1) {
          violations.push({
            selector: el.tagName.toLowerCase(),
            label,
            box: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
            reason: `Element overflows viewport: left=${rect.left}, right=${rect.right}, viewportWidth=${window.innerWidth}`,
          });
        }

        // Check 2: Clipping by any overflow:hidden or overflow:auto ancestor
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          const style = window.getComputedStyle(parent);
          if (
            style.overflow === 'hidden' ||
            style.overflowX === 'hidden' ||
            style.overflow === 'auto' ||
            style.overflowX === 'auto'
          ) {
            const pRect = parent.getBoundingClientRect();
            // If the control's right edge exceeds parent's right edge (with 1px epsilon)
            if (rect.right > pRect.right + 1) {
              violations.push({
                selector: el.tagName.toLowerCase(),
                label,
                box: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
                reason: `Clipped by ancestor [${parent.className}]: child.right=${rect.right} > parent.right=${pRect.right}`,
              });
              break;
            }
          }
          parent = parent.parentElement;
        }

        // Check 3: Touch targets >= 44x44px on mobile (<640px)
        if (isMob) {
          // Allow small inline inputs if width or height is reasonable, but buttons/selects/touch targets must be >= 44
          const isButtonOrTouchControl =
            el.tagName === 'BUTTON' ||
            el.tagName === 'A' ||
            el.tagName === 'SELECT' ||
            el.classList.contains('min-h-[44px]');

          if (isButtonOrTouchControl) {
            if (rect.width < 44 || rect.height < 44) {
              violations.push({
                selector: el.tagName.toLowerCase(),
                label,
                box: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
                reason: `Touch target < 44px on mobile: ${rect.width}x${rect.height}px`,
              });
            }
          }
        }
      }

      return violations;
    }, isMobile);

    return auditResults;
  };

  for (const width of [320, 360, 390, 1440]) {
    test(`Viewport ${width}px: no controls clipped and touch targets compliant`, async ({
      page,
      context,
    }) => {
      await applyAuthCookies(context);
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/editor/${docId}`);
      await page.waitForSelector('#toolbar-btn-save');

      // Expand Experience section so entries are visible
      const expSection = page.locator('[data-section-type="experience"]');
      await expect(expSection).toBeVisible();

      const violations = await checkClippingAndTouchTargets(page, width);
      expect(
        violations,
        `Violations found at ${width}px:\n${violations.map((v: any) => `${v.label} (${v.selector}): ${v.reason}`).join('\n')}`
      ).toHaveLength(0);
    });
  }

  test('Capture screenshots at 320px and 390px', async ({ page, context }) => {
    await applyAuthCookies(context);
    const artifactDir =
      process.env.ARTIFACT_DIR || 'C:\\Users\\Diyan\\.gemini\\antigravity\\brain\\0476a383-8a86-41cb-a552-ce7ab883faf8';

    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/editor/${docId}`);
      await page.waitForSelector('#toolbar-btn-save');

      // 1. Top of editor
      await page.screenshot({
        path: path.join(artifactDir, `mobile_${width}px_top_of_editor.png`),
        animations: 'disabled',
      });

      // 2. Expanded Experience section with >= 2 entries
      const expSection = page.locator('[data-section-type="experience"]');
      await expSection.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(artifactDir, `mobile_${width}px_experience_section.png`),
        animations: 'disabled',
      });

      // 3. Skills section
      const skillsSection = page.locator('[data-section-type="skills"]');
      await skillsSection.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(artifactDir, `mobile_${width}px_skills_section.png`),
        animations: 'disabled',
      });

      // 4. ATS tab
      const atsTabBtn = page.locator('#mobile-ats-tab-btn');
      if (await atsTabBtn.isVisible()) {
        await atsTabBtn.click();
        await page.waitForSelector('#ats-readiness-panel', { timeout: 10000 });
        await page.screenshot({
          path: path.join(artifactDir, `mobile_${width}px_ats_tab.png`),
          animations: 'disabled',
        });
      }
    }
  });
});
