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

const artifactDir = process.env.ARTIFACT_DIR || path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'antigravity', 'brain', '0476a383-8a86-41cb-a552-ce7ab883faf8');

const viewports = [
  { name: '1440px', width: 1440, height: 900 },
  { name: '390px', width: 390, height: 844 },
];

const pages = [
  { id: 'landing', path: '/' },
  { id: 'login', path: '/login' },
  { id: 'onboarding', path: '/onboarding' },
  { id: 'dashboard', path: '/dashboard' },
  { id: 'profile', path: '/profile' },
];

async function main() {
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testEmail = `part-b-audit-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestPassAudit123!';
  let userId = null;

  try {
    const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Audit Professional' },
    });
    if (userErr) throw userErr;
    userId = userRecord.user.id;

    // Seed master profile with Step 1 fields
    await adminClient.from('master_profiles').insert({
      user_id: userId,
      preferred_name: 'Alex Example',
      professional_email: 'alex.example@example.com',
      phone: '+91 98765 43210',
      current_city: 'Mumbai',
      current_country: 'India',
      linkedin_url: 'https://linkedin.com/in/alexexample',
      github_url: 'https://github.com/alexexample',
      personal_website_url: 'https://example.com/alex',
      other_links: ['https://scholar.google.com/citations?user=demo'],
      background_group: 'engineering_technology',
      specialization: 'Computer Science Engineering',
      headline: 'Software Engineer & AI Researcher',
      summary: 'Passionate computer science graduate with deep interest in distributed systems, web architectures, and agentic workflows.',
    });

    // Generate SSR auth cookies
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

      for (const p of pages) {
        console.log(`Navigating to ${p.path} at ${vp.name}...`);
        await page.goto(`http://localhost:3000${p.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);

        const screenshotPath = path.join(artifactDir, `part_b_${p.id}_${vp.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Saved screenshot: ${screenshotPath}`);
      }

      await context.close();
    }

    await browser.close();
  } finally {
    if (userId) {
      console.log(`Cleaning up test user ${userId}...`);
      await adminClient.auth.admin.deleteUser(userId);
      console.log('Test user deleted successfully.');
    }
  }
}

main().catch(console.error);
