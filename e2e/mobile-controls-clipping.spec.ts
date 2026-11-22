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
          text: 'Expert in fault-tolerant distributed consensus algorithms and high-scale architecture.',
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
              id: 'exp-entry-1',
              type: 'work',
              role: 'Staff Infrastructure Engineer',
              organization: 'Global Systems LLC',
              location: 'San Francisco, CA',
              startDate: '2021-01',
              endDate: 'Present',
              bullets: ['Architected low-latency message streaming layer.'],
            },
            {
              id: 'exp-entry-2',
              type: 'work',
              role: 'Senior Cloud Engineer',
              organization: 'Distributed Labs',
              location: 'New York, NY',
              startDate: '2018-05',
              endDate: '2020-12',
              bullets: ['Optimized Raft consensus throughput across edge regions.'],
            },
          ],
        },
      },
      {
        document_id: docId,
        section_type: 'education',
        title: 'Education',
        order_index: 3,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'edu-entry-1',
              institution: 'Massachusetts Institute of Technology',
              degree: 'M.S. in Computer Science',
              fieldOfStudy: 'Distributed Systems',
              location: 'Cambridge, MA',
              startDate: '2016-09',
              endDate: '2018-05',
              bullets: ['Thesis on Byzantine fault tolerance in federated networks.'],
            },
            {
              id: 'edu-entry-2',
              institution: 'Stanford University',
              degree: 'B.S. in Electrical Engineering & Computer Science',
              fieldOfStudy: 'Computer Systems',
              location: 'Stanford, CA',
              startDate: '2012-09',
              endDate: '2016-06',
              bullets: ['Graduated with departmental honors.'],
            },
          ],
        },
      },
      {
        document_id: docId,
        section_type: 'projects',
        title: 'Projects',
        order_index: 4,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'proj-entry-1',
              title: 'VectorFlow Distributed Graph Engine',
              role: 'Lead Architect',
              startDate: '2022-01',
              endDate: '2022-11',
              url: 'https://github.com/example/vectorflow',
              bullets: ['High-throughput vector search over sharded memory indices.'],
            },
            {
              id: 'proj-entry-2',
              title: 'MeshLock Distributed Mutex Provider',
              role: 'Creator & Maintainer',
              startDate: '2020-03',
              endDate: '2021-02',
              url: 'https://github.com/example/meshlock',
              bullets: ['Lease-based lock provider with strict linearizability guarantees.'],
            },
          ],
        },
      },
      {
        document_id: docId,
        section_type: 'skills',
        title: 'Skills & Competencies',
        order_index: 5,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'skill-entry-1',
              category: 'Core Systems & Languages',
              items: [{ name: 'Rust' }, { name: 'Go' }, { name: 'TypeScript' }],
            },
            {
              id: 'skill-entry-2',
              category: 'Distributed Databases & Cloud',
              items: [{ name: 'PostgreSQL' }, { name: 'Raft' }, { name: 'Docker' }],
            },
          ],
        },
      },
      {
        document_id: docId,
        section_type: 'publications',
        title: 'Publications',
        order_index: 6,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'pub-entry-1',
              title: 'Formal Verification of Non-Volatile Multi-Paxos with Bounded Replay',
              authors: ['Alex Example', 'Jordan Vance'],
              venue: 'Proceedings of ACM SOSP 2023',
              publicationDate: '2023-10',
              doiOrUrl: 'https://doi.org/10.1145/3600006.3613145',
            },
            {
              id: 'pub-entry-2',
              title: 'Zero-Copy Interconnects for Disaggregated Microservices',
              authors: ['Alex Example', 'Taylor Morgan'],
              venue: 'USENIX NSDI 2022',
              publicationDate: '2022-04',
              doiOrUrl: 'https://doi.org/10.5555/3548606.3548624',
            },
          ],
        },
      },
      {
        document_id: docId,
        section_type: 'achievements',
        title: 'Honors & Achievements',
        order_index: 7,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'ach-entry-1',
              title: 'Best Paper Award (SOSP 2023)',
              issuer: 'ACM Special Interest Group on Operating Systems',
              date: '2023-10',
              description: 'Awarded for breakthrough formal proof in distributed consensus log recovery.',
            },
            {
              id: 'ach-entry-2',
              title: 'Google Ph.D. Fellowship in Distributed Systems',
              issuer: 'Google Research',
              date: '2021-05',
              description: 'Recognized for pioneering scalable replication algorithms.',
            },
          ],
        },
      },
      {
        document_id: docId,
        section_type: 'certifications',
        title: 'Certifications',
        order_index: 8,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'cert-entry-1',
              name: 'Google Cloud Professional Cloud Architect',
              issuingOrg: 'Google Cloud',
              issuer: 'Google Cloud',
              issueDate: '2022-03',
              credentialUrl: 'https://cloud.google.com/certification',
            },
            {
              id: 'cert-entry-2',
              name: 'Certified Kubernetes Administrator (CKA)',
              issuingOrg: 'Cloud Native Computing Foundation',
              issuer: 'Cloud Native Computing Foundation',
              issueDate: '2021-08',
              credentialUrl: 'https://www.cncf.io/certification/cka/',
            },
          ],
        },
      },
      {
        document_id: docId,
        section_type: 'custom',
        title: 'Grants & Fellowships',
        order_index: 9,
        is_visible: true,
        content: {
          schema_version: '1.0.0',
          entries: [
            {
              id: 'custom-entry-1',
              title: 'NSF Postdoctoral Research Grant ($200,000)',
              subtitle: 'National Science Foundation #2308912',
              date: '2023',
              description: 'Principal Investigator researching verified Paxos state transitions.',
              bullets: ['Multi-year federal research grant support.'],
            },
            {
              id: 'custom-entry-2',
              title: 'Open Source Systems Research Fellowship',
              subtitle: 'Open Source Security Foundation',
              date: '2022',
              description: 'Supported hardening of core Linux network driver stacks.',
              bullets: ['Delivered zero-cost memory safety bindings.'],
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
    test(`Viewport ${width}px: all 10 section headers, entry rows, toolbar, and ATS panel compliant`, async ({
      page,
      context,
    }) => {
      await applyAuthCookies(context);
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/editor/${docId}`);
      await page.waitForSelector('#toolbar-btn-save');

      // 1. Verify Top Toolbar
      const saveBtn = page.locator('#toolbar-btn-save');
      await expect(saveBtn).toBeVisible();
      const exportBtn = page.locator('#download-pdf-button');
      await expect(exportBtn).toBeVisible();

      // 2. Verify all 10 section headers exist and are visible
      const allSectionTypes = [
        'header',
        'summary',
        'experience',
        'education',
        'projects',
        'skills',
        'publications',
        'achievements',
        'certifications',
        'custom',
      ];

      for (const st of allSectionTypes) {
        const secEl = page.locator(`[data-section-type="${st}"]`);
        await expect(secEl, `Section header for [${st}] should be rendered`).toBeVisible();
      }

      // 3. Verify entry rows in all entry-bearing sections
      const entrySectionTypes = [
        'experience',
        'education',
        'projects',
        'skills',
        'publications',
        'achievements',
        'certifications',
        'custom',
      ];

      for (const st of entrySectionTypes) {
        const secEl = page.locator(`[data-section-type="${st}"]`);
        await secEl.scrollIntoViewIfNeeded();
        // Check for presence of entry controls (buttons with aria-label containing entry or category)
        const entryControls = secEl.locator('button[aria-label*="Entry"], button[aria-label*="entry"], input');
        const count = await entryControls.count();
        expect(count, `Section [${st}] must contain interactive entry controls`).toBeGreaterThanOrEqual(1);
      }

      // 4. Run clipping & touch targets audit on Editor view
      const editorViolations = await checkClippingAndTouchTargets(page, width);
      expect(
        editorViolations,
        `Editor violations found at ${width}px:\n${editorViolations.map((v: any) => `${v.label} (${v.selector}): ${v.reason}`).join('\n')}`
      ).toHaveLength(0);

      // 5. Verify ATS Panel
      if (width < 640) {
        const atsTabBtn = page.locator('#mobile-ats-tab-btn');
        if (await atsTabBtn.isVisible()) {
          await atsTabBtn.click();
          await page.waitForSelector('#ats-readiness-panel', { timeout: 10000 });
          const atsViolations = await checkClippingAndTouchTargets(page, width);
          expect(
            atsViolations,
            `ATS panel violations at ${width}px:\n${atsViolations.map((v: any) => `${v.label} (${v.selector}): ${v.reason}`).join('\n')}`
          ).toHaveLength(0);
        }
      } else {
        const atsPanel = page.locator('#ats-readiness-panel');
        if (await atsPanel.isVisible()) {
          const atsViolations = await checkClippingAndTouchTargets(page, width);
          expect(
            atsViolations,
            `Desktop ATS panel violations at ${width}px:\n${atsViolations.map((v: any) => `${v.label} (${v.selector}): ${v.reason}`).join('\n')}`
          ).toHaveLength(0);
        }
      }
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
