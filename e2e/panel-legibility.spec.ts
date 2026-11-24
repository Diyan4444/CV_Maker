 
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

const pagesToTest = ['/', '/login', '/onboarding', '/dashboard', '/profile', '/settings', '/privacy', '/goodbye'] as const;

test.describe.serial('Panel Legibility & Background Isolation Audit', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  const testEmail = `legibility-audit-${Date.now()}@quillfolio.local`;
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
      user_metadata: { full_name: 'Legibility Audit User' },
    });
    if (userErr) throw userErr;
    testUserId = userRecord.user.id;

    // Seed master profile
    await (adminClient as any).from('master_profiles').insert({
      user_id: testUserId,
      background_group: 'Engineering and Technology',
      specialization: 'Computer Science Engineering',
      headline: 'Software Engineer',
      summary: 'Testing panel legibility to ensure zero text sits on raw animated backgrounds.',
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

  for (const pagePath of pagesToTest) {
    test(`Every visible text element on ${pagePath} has an approved opaque panel ancestor`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
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
      await page.waitForTimeout(300);

      // Walk all visible text elements in the DOM
      const auditResult = await page.evaluate(() => {
        // Allowed solid backgrounds:
        // Panels: #FFFFFF (rgb(255, 255, 255)), #F1F7F7 (rgb(241, 247, 247)), #FFE4D8 (rgb(255, 228, 216))
        // Primary Buttons: #800021 (rgb(128, 0, 33)), #881144 (rgb(136, 17, 68))
        const allowedBackgrounds = new Set([
          'rgb(255, 255, 255)',
          'rgb(241, 247, 247)',
          'rgb(255, 228, 216)',
          'rgb(128, 0, 33)',
          'rgb(136, 17, 68)',
        ]);

        const violations: Array<{ text: string; tag: string; nearestBg: string; opacity: string }> = [];

        function isVisible(el: HTMLElement) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
          );
        }

        // Get all elements containing direct text content
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_ELEMENT,
          null
        );

        let node: Node | null;
        while ((node = walker.nextNode())) {
          const el = node as HTMLElement;
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'CANVAS') continue;

          // Check if this element contains immediate non-whitespace text
          let hasDirectText = false;
          for (let i = 0; i < el.childNodes.length; i++) {
            const child = el.childNodes[i];
            if (child.nodeType === Node.TEXT_NODE && (child.textContent || '').trim().length > 0) {
              hasDirectText = true;
              break;
            }
          }

          if (!hasDirectText) continue;
          if (!isVisible(el)) continue;

          // Walk up ancestors to find nearest element with a non-transparent background
          let curr: HTMLElement | null = el;
          let foundBg: string | null = null;
          let foundOpacity = '1';

          while (curr && curr !== document.body && curr !== document.documentElement) {
            const cs = window.getComputedStyle(curr);
            const bg = cs.backgroundColor;

            // Transparent is rgba(0, 0, 0, 0)
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              foundBg = bg;
              foundOpacity = cs.opacity;
              break;
            }
            curr = curr.parentElement;
          }

          const trimmedText = (el.textContent || '').trim().slice(0, 40);

          if (!foundBg) {
            violations.push({
              text: trimmedText,
              tag: el.tagName,
              nearestBg: 'none (sits on page background)',
              opacity: '1',
            });
          } else if (!allowedBackgrounds.has(foundBg)) {
            violations.push({
              text: trimmedText,
              tag: el.tagName,
              nearestBg: foundBg,
              opacity: foundOpacity,
            });
          }
        }

        return violations;
      });

      expect(
        auditResult,
        `Found ${auditResult.length} text elements not inside an approved opaque panel on ${pagePath}: ${JSON.stringify(auditResult, null, 2)}`
      ).toHaveLength(0);

      await context.close();
    });
  }
});
