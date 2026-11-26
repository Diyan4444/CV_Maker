 
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

      // Walk all visible text elements in the DOM and compute effective opaque background + WCAG contrast
      const auditResult = await page.evaluate(() => {
        function parseRgba(colorStr: string): [number, number, number, number] | null {
          const match = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
          if (!match) return null;
          return [
            Number(match[1]),
            Number(match[2]),
            Number(match[3]),
            match[4] !== undefined ? Number(match[4]) : 1,
          ];
        }

        function compositeOver(fg: [number, number, number, number], bg: [number, number, number]): [number, number, number] {
          const a = fg[3];
          return [
            Math.round(fg[0] * a + bg[0] * (1 - a)),
            Math.round(fg[1] * a + bg[1] * (1 - a)),
            Math.round(fg[2] * a + bg[2] * (1 - a)),
          ];
        }

        function relativeLuminance([r, g, b]: [number, number, number]): number {
          const toLinear = (c: number) => {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
        }

        function contrastRatio(c1: [number, number, number], c2: [number, number, number]): number {
          const l1 = relativeLuminance(c1);
          const l2 = relativeLuminance(c2);
          const lighter = Math.max(l1, l2);
          const darker = Math.min(l1, l2);
          return (lighter + 0.05) / (darker + 0.05);
        }

        const violations: Array<{
          text: string;
          tag: string;
          fg: string;
          bg: string;
          ratio: number;
          minRequired: number;
          reason: string;
        }> = [];

        function isVisible(el: HTMLElement) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (style.position === 'fixed' && style.clip === 'rect(0px, 0px, 0px, 0px)') return false;
          if (el.classList.contains('sr-only')) return false;
          return (
            rect.width > 1 &&
            rect.height > 1 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            parseFloat(style.opacity || '1') > 0
          );
        }

        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_ELEMENT,
          null
        );

        let node: Node | null;
        while ((node = walker.nextNode())) {
          const el = node as HTMLElement;
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'CANVAS') continue;

          let hasDirectText = false;
          for (let i = 0; i < el.childNodes.length; i++) {
            const child = el.childNodes[i];
            if (child.nodeType === Node.TEXT_NODE && (child.textContent || '').trim().length > 0) {
              hasDirectText = true;
              break;
            }
          }

          if (!hasDirectText || !isVisible(el)) continue;

          // Collect ancestor chain from document.body down to el
          const chain: HTMLElement[] = [];
          let curr: HTMLElement | null = el;
          while (curr && curr !== document.documentElement) {
            chain.unshift(curr);
            curr = curr.parentElement;
          }

          // Composite non-transparent backgrounds top-down starting from warm page (#EFE8DE)
          let effectiveBg: [number, number, number] = [239, 232, 222];
          let hasPanelBg = false;
          let maxAncestorBgAlpha = 0;

          for (const ancestor of chain) {
            const cs = window.getComputedStyle(ancestor);
            const parsedBg = parseRgba(cs.backgroundColor);
            if (parsedBg && parsedBg[3] > 0) {
              effectiveBg = compositeOver(parsedBg, effectiveBg);
              if (ancestor !== document.body) {
                hasPanelBg = true;
                maxAncestorBgAlpha = Math.max(maxAncestorBgAlpha, parsedBg[3]);
              }
            }
          }

          const elStyle = window.getComputedStyle(el);
          const parsedFg = parseRgba(elStyle.color);
          if (!parsedFg) continue;
          const effectiveFg = compositeOver(parsedFg, effectiveBg);

          const fontSizePx = parseFloat(elStyle.fontSize || '16');
          const fontWeight = parseInt(elStyle.fontWeight || '400', 10) || 400;
          const isLargeText = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
          const minRequired = isLargeText ? 3.0 : 4.5;
          const ratio = contrastRatio(effectiveFg, effectiveBg);
          const trimmedText = (el.textContent || '').trim().slice(0, 40);

          if (!hasPanelBg) {
            violations.push({
              text: trimmedText,
              tag: el.tagName,
              fg: `rgb(${effectiveFg.join(',')})`,
              bg: `rgb(${effectiveBg.join(',')})`,
              ratio: Number(ratio.toFixed(2)),
              minRequired,
              reason: 'Text sits directly on page background without an opaque panel',
            });
          } else if (maxAncestorBgAlpha < 0.92) {
            violations.push({
              text: trimmedText,
              tag: el.tagName,
              fg: `rgb(${effectiveFg.join(',')})`,
              bg: `rgb(${effectiveBg.join(',')})`,
              ratio: Number(ratio.toFixed(2)),
              minRequired,
              reason: `Panel background alpha ${maxAncestorBgAlpha.toFixed(2)} is below 0.92`,
            });
          } else if (ratio < minRequired) {
            violations.push({
              text: trimmedText,
              tag: el.tagName,
              fg: `rgb(${effectiveFg.join(',')})`,
              bg: `rgb(${effectiveBg.join(',')})`,
              ratio: Number(ratio.toFixed(2)),
              minRequired,
              reason: `Contrast ${ratio.toFixed(2)}:1 is below WCAG ${minRequired}:1`,
            });
          }
        }

        return violations;
      });

      expect(
        auditResult,
        `Found ${auditResult.length} legibility/contrast violations on ${pagePath}: ${JSON.stringify(auditResult, null, 2)}`
      ).toHaveLength(0);

      await context.close();
    });
  }
});
