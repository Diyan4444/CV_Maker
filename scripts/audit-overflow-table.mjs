import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard.mjs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
assertTestProjectRefAllowed();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const viewports = [
  { name: '320px', width: 320, height: 640 },
  { name: '360px', width: 360, height: 740 },
  { name: '390px', width: 390, height: 844 },
  { name: '1440px', width: 1440, height: 900 },
];

const themes = ['mist', 'wine', 'ink', 'forest'];
const pages = [
  { name: '/', path: 'http://localhost:3000/' },
  { name: '/login', path: 'http://localhost:3000/login' },
  { name: '/onboarding', path: 'http://localhost:3000/onboarding' },
  { name: '/dashboard', path: 'http://localhost:3000/dashboard' },
  { name: '/profile', path: 'http://localhost:3000/profile' },
];

async function main() {
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testEmail = `audit-table-${Date.now()}@quillfolio.local`;
  const testPassword = 'AuditTablePassword123!';

  // Create temporary audit user
  const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Audit User' },
  });
  if (userErr) throw userErr;
  const userId = userRecord.user.id;

  await adminClient.from('master_profiles').insert({
    user_id: userId,
    background_group: 'engineering_technology',
    specialization: 'Computer Science Engineering',
    headline: 'Audit Graduate',
    summary: 'Summary for table audit.',
  });

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
  const results = [];

  for (const vp of viewports) {
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
      sameSite: 'Lax',
    }));
    await context.addCookies(cookieEntries);
    const page = await context.newPage();

    for (const pg of pages) {
      await page.goto(pg.path, { waitUntil: 'domcontentloaded' });

      for (const theme of themes) {
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await page.waitForTimeout(50);

        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));

        const isOverflow = scrollWidth > innerWidth;
        results.push({
          page: pg.name,
          viewport: vp.name,
          theme,
          scrollWidth,
          innerWidth,
          overflow: isOverflow ? 'FAIL' : 'PASS (0px)',
        });
      }
    }
    await context.close();
  }

  await browser.close();
  await adminClient.auth.admin.deleteUser(userId);

  console.log('| Page | Viewport | Theme | scrollWidth | innerWidth | Status |');
  console.log('| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const r of results) {
    console.log(`| \`${r.page}\` | ${r.viewport} | ${r.theme} | ${r.scrollWidth}px | ${r.innerWidth}px | ${r.overflow} |`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
