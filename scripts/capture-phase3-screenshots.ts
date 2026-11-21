import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const artifactDir = 'C:\\Users\\Diyan\\.gemini\\antigravity\\brain\\0476a383-8a86-41cb-a552-ce7ab883faf8';

async function main() {
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testEmail = `screenshot-user-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';

  const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Dr. Jane Editor User' },
  });
  if (userErr) throw userErr;
  const testUserId = userRecord.user.id;

  // Master profile
  const { data: profileRecord, error: profErr } = await (adminClient as any)
    .from('master_profiles')
    .insert({
      user_id: testUserId,
      background_group: 'Engineering and Technology',
      specialization: 'Computer Science Engineering',
      headline: 'Staff Distributed Systems Engineer',
      summary: 'Expert in cloud-native fault-tolerant architectures and kernel debugging.',
    })
    .select('id')
    .single();
  if (profErr) throw profErr;

  // Add experience
  await (adminClient as any).from('experience').insert({
    master_profile_id: profileRecord.id,
    title: 'Principal Systems Architect',
    company: 'Distributed Systems Corp',
    location: 'Bengaluru, India',
    start_date: '2021-01',
    is_current: true,
    bullets: [
      'Designed high-throughput Raft consensus layer handling 10M ops/sec.',
      'Mentored engineering teams across latency optimization and observability.',
    ],
    technologies: ['Rust', 'Go', 'Kubernetes'],
  });

  // Add education
  await (adminClient as any).from('education').insert({
    master_profile_id: profileRecord.id,
    institution: 'Indian Institute of Technology Madras',
    degree: 'B.Tech in Computer Science',
    field_of_study: 'Distributed Computing',
    start_date: '2015-08',
    end_date: '2019-05',
    grade: '9.4 CGPA',
  });

  // Add publication
  await (adminClient as any).from('publications').insert({
    master_profile_id: profileRecord.id,
    title: 'High-Throughput Consensus in Geo-Distributed Memory Clusters',
    authors: ['Jane Editor', 'Alan Smith', 'K. Rao'],
    venue: 'ACM SIGOPS Operating Systems Review',
    year: '2023',
    doi: '10.1145/3575693.3575701',
    citation_count: 42,
  });

  // Sign in to get session cookies
  const capturedCookies: Record<string, string> = {};
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
  const context = await browser.newContext();
  await context.addCookies(
    Object.entries(capturedCookies).map(([name, value]) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
    }))
  );

  const page = await context.newPage();

  // 1. Dashboard Desktop (1440px)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(artifactDir, 'phase3_dashboard_1440px.png'), fullPage: true });
  console.log('Saved phase3_dashboard_1440px.png');

  // 2. Dashboard Mobile (390px)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(artifactDir, 'phase3_dashboard_390px.png'), fullPage: true });
  console.log('Saved phase3_dashboard_390px.png');

  // Create a document via UI
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/dashboard');
  await page.getByRole('button', { name: /New Document/i }).click();
  await page.fill('#doc-title', 'Staff Systems Resume 2026');
  await page.fill('#target-role', 'Principal Infrastructure Architect');
  await page.getByRole('button', { name: /Create & Open/i }).click();
  await page.waitForURL(/\/editor\/[a-f0-9-]+/, { timeout: 30000 });
  const editorUrl = page.url();
  await page.waitForTimeout(2000); // let PDF compile

  // 3. Editor with ATS Single Column (1440px)
  await page.screenshot({ path: path.join(artifactDir, 'phase3_editor_ats_1440px.png'), fullPage: true });
  console.log('Saved phase3_editor_ats_1440px.png');

  // 4. Editor with Modern Professional
  await page.locator('#template-picker').selectOption('modern_professional');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'phase3_editor_modern_1440px.png'), fullPage: true });
  console.log('Saved phase3_editor_modern_1440px.png');

  // 5. Editor with Academic CV
  await page.locator('#template-picker').selectOption('academic_cv');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'phase3_editor_academic_1440px.png'), fullPage: true });
  console.log('Saved phase3_editor_academic_1440px.png');

  // 6. Mobile Editor at 390px - Edit View
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(editorUrl);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Edit Sections/i }).click();
  await page.screenshot({ path: path.join(artifactDir, 'phase3_editor_mobile_edit_390px.png'), fullPage: true });
  console.log('Saved phase3_editor_mobile_edit_390px.png');

  // 7. Mobile Editor at 390px - Live Preview View
  await page.getByRole('button', { name: /Live A4 Preview/i }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'phase3_editor_mobile_preview_390px.png'), fullPage: true });
  console.log('Saved phase3_editor_mobile_preview_390px.png');

  // 8. Dev Gallery Overview (1440px)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/dev/templates');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'phase3_dev_gallery_1440px.png'), fullPage: true });
  console.log('Saved phase3_dev_gallery_1440px.png');

  // Clean up user
  await browser.close();
  await adminClient.auth.admin.deleteUser(testUserId);
  console.log('Completed all screenshot captures!');
}

main().catch((err) => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});
