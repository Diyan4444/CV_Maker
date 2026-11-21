import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard.mjs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
assertTestProjectRefAllowed();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const outDir = path.resolve(process.cwd(), 'screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [
  { name: '1440px', width: 1440, height: 900 },
  { name: '390px', width: 390, height: 844 },
];

const themes = ['mist', 'ink'];

async function capture() {
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testEmail = `playwright-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestPlaywrightPass123!';

  // Create temporary test user with confirmed email
  const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Visual Audit User' },
  });
  if (userErr) throw userErr;
  const userId = userRecord.user.id;

  // Insert master profile for dashboard & profile pages
  await adminClient.from('master_profiles').insert({
    user_id: userId,
    background_group: 'engineering_technology',
    specialization: 'Computer Science Engineering',
    headline: 'Visual Audit Fresh Graduate',
    summary: 'Audited master profile summary demonstrating clean editorial formatting.',
  });

  // Generate exact SSR cookies using @supabase/ssr
  const capturedCookies = {};
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

  await ssrClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  const browser = await chromium.launch();

  for (const vp of viewports) {
    for (const theme of themes) {
      console.log(`Auditing and capturing for ${vp.name} in theme '${theme}'...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });

      // Inject @supabase/ssr generated cookies
      const cookieEntries = Object.entries(capturedCookies).map(([name, value]) => ({
        name,
        value,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      }));

      await context.addCookies(cookieEntries);

      const page = await context.newPage();

      const setTheme = async () => {
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
      };

      const checkOverflow = async (pageName) => {
        const isOverflowing = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        if (isOverflowing) {
          console.warn(`WARNING: Horizontal overflow detected on ${pageName} at ${vp.name} (${theme})`);
        }
      };

      // 1. Landing Page (/)
      await page.goto('http://localhost:3000/');
      await setTheme();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(outDir, `landing_${theme}_${vp.name}.png`), fullPage: true });
      await checkOverflow('landing');

      // 2. Login Page (/login)
      await page.goto('http://localhost:3000/login');
      await setTheme();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(outDir, `login_${theme}_${vp.name}.png`), fullPage: true });
      await checkOverflow('login');

      // 3. Onboarding: Mechanical Engineering
      await page.goto('http://localhost:3000/onboarding');
      await setTheme();
      await page.waitForSelector('#bg-group', { timeout: 10000 });
      await page.selectOption('#bg-group', 'engineering_technology');
      await page.selectOption('#spec-select', 'Mechanical Engineering');
      await page.locator('button:has-text("Continue to Department Questions")').click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, `onboarding_mech_${theme}_${vp.name}.png`), fullPage: true });
      await checkOverflow('onboarding_mech');

      // 4. Onboarding: Finance
      await page.goto('http://localhost:3000/onboarding');
      await setTheme();
      await page.waitForSelector('#bg-group');
      await page.selectOption('#bg-group', 'commerce_management');
      await page.selectOption('#spec-select', 'Finance');
      await page.locator('button:has-text("Continue to Department Questions")').click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, `onboarding_finance_${theme}_${vp.name}.png`), fullPage: true });
      await checkOverflow('onboarding_finance');

      // 5. Onboarding: Psychology
      await page.goto('http://localhost:3000/onboarding');
      await setTheme();
      await page.waitForSelector('#bg-group');
      await page.selectOption('#bg-group', 'arts_humanities');
      await page.selectOption('#spec-select', 'Psychology');
      await page.locator('button:has-text("Continue to Department Questions")').click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, `onboarding_psychology_${theme}_${vp.name}.png`), fullPage: true });
      await checkOverflow('onboarding_psychology');

      // 6. Onboarding: Other (type your own)
      await page.goto('http://localhost:3000/onboarding');
      await setTheme();
      await page.waitForSelector('#bg-group');
      await page.selectOption('#bg-group', 'other');
      await page.selectOption('#spec-select', 'Other (type your own)');
      await page.locator('input[placeholder="Specify your field or branch"]').fill('Marine Biology');
      await page.locator('button:has-text("Continue to Department Questions")').click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, `onboarding_other_${theme}_${vp.name}.png`), fullPage: true });
      await checkOverflow('onboarding_other');

      // 7. Dashboard (/dashboard)
      await page.goto('http://localhost:3000/dashboard');
      await setTheme();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(outDir, `dashboard_${theme}_${vp.name}.png`), fullPage: true });
      await checkOverflow('dashboard');

      // 8. Profile (/profile)
      await page.goto('http://localhost:3000/profile');
      await setTheme();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(outDir, `profile_${theme}_${vp.name}.png`), fullPage: true });
      await checkOverflow('profile');

      await context.close();
    }
  }

  await browser.close();

  // Cleanup temporary user
  await adminClient.auth.admin.deleteUser(userId);
  console.log('Visual audit finished cleanly. All screenshots saved to screenshots/.');
}

capture().catch((e) => {
  console.error('Capture error:', e);
  process.exit(1);
});
