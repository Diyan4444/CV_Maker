import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { spawn, ChildProcess } from 'node:child_process';
import dotenv from 'dotenv';
import path from 'path';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
assertTestProjectRefAllowed();

interface MetricRun {
  ttfb: number;
  serverTotal: number;
  serverAuth: number;
  serverDb: number;
  serverDbCount: number;
  domContentLoaded: number;
  load: number;
  lcp: number;
  jsBytes: number;
  cssBytes: number;
  fontBytes: number;
  workerBytes: number;
  firstPreview?: number;
  editToPreview?: number;
}

interface SummaryMetric {
  median: number;
  worst: number;
}

function computeSummary(values: number[]): SummaryMetric {
  if (values.length === 0) return { median: 0, worst: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const worst = sorted[sorted.length - 1];
  return {
    median: Math.round(median * 10) / 10,
    worst: Math.round(worst * 10) / 10,
  };
}

function parseServerTiming(headerVal: string | null): {
  total: number;
  auth: number;
  db: number;
  dbCount: number;
} {
  if (!headerVal) return { total: 0, auth: 0, db: 0, dbCount: 0 };
  let total = 0;
  let auth = 0;
  let db = 0;
  let dbCount = 0;

  const parts = headerVal.split(',');
  for (const p of parts) {
    const trimmed = p.trim();
    const durMatch = trimmed.match(/dur=([\d.]+)/);
    const dur = durMatch ? parseFloat(durMatch[1]) : 0;
    if (trimmed.startsWith('total')) total = dur;
    else if (trimmed.startsWith('auth')) auth = dur;
    else if (trimmed.startsWith('db-count')) dbCount = dur;
    else if (trimmed.startsWith('db')) db = dur;
  }
  return { total, auth, db, dbCount };
}

async function main() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3100';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`   QUILLFOLIO ROUTE PERFORMANCE BASELINE BENCHMARK    `);
  console.log(`   Target Server: ${BASE_URL}                         `);
  console.log(`======================================================\n`);

  let spawnedServer: ChildProcess | null = null;
  const isServerUp = async () => {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      return res.status < 500;
    } catch {
      return false;
    }
  };

  if (!(await isServerUp())) {
    console.log(`[Server] No server detected at ${BASE_URL}. Spawning next start -p 3100...`);
    spawnedServer = spawn('npx', ['next', 'start', '-p', '3100'], {
      shell: true,
      stdio: 'pipe',
    });

    let attempts = 0;
    while (attempts < 60) {
      await new Promise((r) => setTimeout(r, 1000));
      if (await isServerUp()) {
        console.log(`[Server] Local production server is up and listening on ${BASE_URL}`);
        break;
      }
      attempts++;
    }
    if (!(await isServerUp())) {
      throw new Error(`Failed to start server on ${BASE_URL} after 60 seconds.`);
    }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testEmail = `bench-${Date.now()}@quillfolio.local`;
  const testPassword = 'Password123!Benchmark';
  let testUserId = '';
  let docId = '';
  const capturedCookies: Record<string, string> = {};

  try {
    // 1. Create dedicated benchmark user
    console.log('[Setup] Creating benchmark test account...');
    const { data: userRec, error: uErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Alex Benchmark' },
    });
    if (uErr) throw uErr;
    testUserId = userRec.user.id;

    // 2. Sign in and capture cookies
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

    const { error: sErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (sErr) throw sErr;

    // 2.5 Create master profile for test user to prevent onboarding redirect
    await adminClient.from('master_profiles').insert({
      user_id: testUserId,
      full_name: 'Alex Benchmark',
      headline: 'Principal Infrastructure Architect',
      email: testEmail,
    });

    // 3. Create document for editor benchmark
    const { data: docRec, error: dErr } = await adminClient
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Benchmark Candidate Resume',
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        version: 1,
      })
      .select('id')
      .single();
    if (dErr) throw dErr;
    docId = docRec.id;

    // Populate standard sections
    await adminClient.from('document_sections').insert([
      {
        document_id: docId,
        section_type: 'header',
        title: 'Header & Contact Information',
        order_index: 0,
        is_visible: true,
        content: {
          fullName: 'Alex Example Benchmark',
          headline: 'Principal Infrastructure Architect',
          email: testEmail,
          otherLinks: [],
          schema_version: '1.0.0',
        },
      },
      {
        document_id: docId,
        section_type: 'summary',
        title: 'Professional Summary',
        order_index: 1,
        is_visible: true,
        content: {
          text: 'Architect specializing in zero-downtime distributed storage and sub-second rendering pipelines.',
          schema_version: '1.0.0',
        },
      },
      {
        document_id: docId,
        section_type: 'experience',
        title: 'Experience',
        order_index: 2,
        is_visible: true,
        content: {
          entries: [
            {
              id: 'bench-exp-1',
              role: 'Staff Systems Engineer',
              organization: 'Global Cloud Systems',
              location: 'Zurich, Switzerland',
              startDate: '2020-01',
              endDate: 'Present',
              isCurrent: true,
              type: 'work',
              bullets: [
                'Engineered high-throughput event processing engine handling 85k requests per second.',
                'Diminished cluster serialization latency by 45% using optimized column schemas.',
              ],
            },
          ],
          schema_version: '1.0.0',
        },
      },
    ]);

    console.log(`[Setup] Ready with Document ID: ${docId}\n`);

    const browser = await chromium.launch({ headless: true });

    const profiles = [
      { name: 'Unthrottled (Desktop 1440px)', isThrottled: false, width: 1440, height: 900 },
      { name: 'Mobile Throttled (Mid-Range 4G, 4x CPU, 390px)', isThrottled: true, width: 390, height: 844 },
    ];

    const routes = [
      { path: '/', isAuth: false },
      { path: '/privacy', isAuth: false },
      { path: '/login', isAuth: false },
      { path: '/dashboard', isAuth: true },
      { path: '/profile', isAuth: true },
      { path: '/settings', isAuth: true },
      { path: '/onboarding', isAuth: true },
      { path: `/editor/${docId}`, isAuth: true },
    ];

    for (const prof of profiles) {
      console.log(`\n======================================================`);
      console.log(` PROFILE: ${prof.name}`);
      console.log(`======================================================\n`);

      for (const r of routes) {
        const routeLabel = r.path.startsWith('/editor/') ? '/editor/[id]' : r.path;
        console.log(`>>> Measuring Route: ${routeLabel} (5 iterations)...`);

        const runs: MetricRun[] = [];

        for (let iter = 1; iter <= 5; iter++) {
          const context = await browser.newContext({
            viewport: { width: prof.width, height: prof.height },
          });

          if (r.isAuth) {
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
          }

          const page = await context.newPage();
          const client = await context.newCDPSession(page);

          if (prof.isThrottled) {
            // 4x CPU slowdown
            await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
            // Mid-range mobile 4G network: 150ms RTT, 1.6 Mbps down, 750 kbps up
            await client.send('Network.emulateNetworkConditions', {
              offline: false,
              latency: 150,
              downloadThroughput: (1.6 * 1024 * 1024) / 8,
              uploadThroughput: (750 * 1024) / 8,
            });
          }

          let jsBytes = 0;
          let cssBytes = 0;
          let fontBytes = 0;
          let workerBytes = 0;
          let serverTimingHeader: string | null = null;

          page.on('response', async (res) => {
            const url = res.url();
            const headers = res.headers();
            let length = parseInt(headers['content-length'] || '0', 10);
            if (!length) {
              try {
                const b = await res.body();
                length = b.length;
              } catch {}
            }

            if (url.endsWith(r.path) || url.includes(r.path)) {
              if (headers['server-timing']) {
                serverTimingHeader = headers['server-timing'];
              }
            }

            if (url.includes('.js') || url.includes('/_next/static/chunks/')) {
              jsBytes += length;
            } else if (url.includes('.css')) {
              cssBytes += length;
            } else if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf')) {
              fontBytes += length;
            } else if (url.includes('worker') || url.includes('.worker.')) {
              workerBytes += length;
            }
          });

          const navStart = performance.now();
          const response = await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'load' });
          if (!serverTimingHeader && response) {
            serverTimingHeader = response.headers()['server-timing'] || null;
          }

          // Evaluate Performance API metrics
          let navMetrics = { ttfb: 0, domContentLoaded: 0, load: 0, lcp: 0 };
          try {
            await page.waitForLoadState('load', { timeout: 10000 });
            await page.waitForTimeout(200);
            navMetrics = await page.evaluate(() => {
              const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
              const ttfb = nav ? nav.responseStart - nav.requestStart : 0;
              const domContentLoaded = nav ? nav.domContentLoadedEventEnd - nav.startTime : 0;
              const load = nav ? nav.loadEventEnd - nav.startTime : 0;

              let lcp = 0;
              const entries = performance.getEntriesByType('paint');
              for (const e of entries) {
                if (e.name === 'first-contentful-paint') lcp = e.startTime;
              }

              return { ttfb, domContentLoaded, load, lcp };
            });
          } catch {}

          const timingParsed = parseServerTiming(serverTimingHeader);

          let firstPreview: number | undefined;
          let editToPreview: number | undefined;

          if (r.path.startsWith('/editor/')) {
            if (prof.width < 1024) {
              const mobilePreviewBtn = page.locator('button[aria-label="Live A4 Preview Tab"]');
              if (await mobilePreviewBtn.isVisible()) {
                await mobilePreviewBtn.click();
              }
            }
            // Measure time to first rendered preview
            await page.waitForSelector('#pdf-preview-canvas-container canvas', {
              state: 'attached',
              timeout: 35000,
            });
            firstPreview = Math.round(performance.now() - navStart);

            // Measure time from edit to updated preview
            const input = page.locator('input[aria-label="Document Title"]');
            if (await input.isVisible()) {
              const editStart = performance.now();
              await input.fill(`Title Mod ${iter}`);

              // Wait for compiling attribute to toggle back to false
              await page.waitForFunction(
                () => {
                  const el = document.querySelector('#pdf-preview-canvas-container');
                  return el && el.getAttribute('data-compiling') === 'false';
                },
                { timeout: 15000 }
              );
              editToPreview = Math.round(performance.now() - editStart);
            }
          }

          runs.push({
            ttfb: navMetrics.ttfb,
            serverTotal: timingParsed.total,
            serverAuth: timingParsed.auth,
            serverDb: timingParsed.db,
            serverDbCount: timingParsed.dbCount,
            domContentLoaded: navMetrics.domContentLoaded,
            load: navMetrics.load,
            lcp: navMetrics.lcp,
            jsBytes: Math.round(jsBytes / 1024),
            cssBytes: Math.round(cssBytes / 1024),
            fontBytes: Math.round(fontBytes / 1024),
            workerBytes: Math.round(workerBytes / 1024),
            firstPreview,
            editToPreview,
          });

          await context.close();
        }

        // Output table for route
        console.log(`--- Results for ${routeLabel} [${prof.name}] ---`);
        const sTtfb = computeSummary(runs.map((x) => x.ttfb));
        const sServerTotal = computeSummary(runs.map((x) => x.serverTotal));
        const sServerAuth = computeSummary(runs.map((x) => x.serverAuth));
        const sServerDb = computeSummary(runs.map((x) => x.serverDb));
        const sServerDbCount = computeSummary(runs.map((x) => x.serverDbCount));
        const sDcl = computeSummary(runs.map((x) => x.domContentLoaded));
        const sLoad = computeSummary(runs.map((x) => x.load));
        const sLcp = computeSummary(runs.map((x) => x.lcp));
        const sJs = computeSummary(runs.map((x) => x.jsBytes));
        const sCss = computeSummary(runs.map((x) => x.cssBytes));
        const sFont = computeSummary(runs.map((x) => x.fontBytes));
        const sWorker = computeSummary(runs.map((x) => x.workerBytes));

        console.log(`| Metric | Median | Worst |`);
        console.log(`| :--- | :--- | :--- |`);
        console.log(`| TTFB | ${sTtfb.median} ms | ${sTtfb.worst} ms |`);
        console.log(`| Server-Timing (total) | ${sServerTotal.median} ms | ${sServerTotal.worst} ms |`);
        console.log(`| Server-Timing (auth) | ${sServerAuth.median} ms | ${sServerAuth.worst} ms |`);
        console.log(`| Server-Timing (db) | ${sServerDb.median} ms | ${sServerDb.worst} ms |`);
        console.log(`| Server-Timing (db-count) | ${sServerDbCount.median} | ${sServerDbCount.worst} |`);
        console.log(`| DOMContentLoaded | ${sDcl.median} ms | ${sDcl.worst} ms |`);
        console.log(`| Load Event | ${sLoad.median} ms | ${sLoad.worst} ms |`);
        console.log(`| LCP / FCP | ${sLcp.median} ms | ${sLcp.worst} ms |`);
        console.log(`| Transferred JS | ${sJs.median} KB | ${sJs.worst} KB |`);
        console.log(`| Transferred CSS | ${sCss.median} KB | ${sCss.worst} KB |`);
        console.log(`| Transferred Fonts | ${sFont.median} KB | ${sFont.worst} KB |`);
        console.log(`| Transferred Workers | ${sWorker.median} KB | ${sWorker.worst} KB |`);

        if (r.path.startsWith('/editor/')) {
          const sFirstPrev = computeSummary(runs.map((x) => x.firstPreview || 0));
          const sEditPrev = computeSummary(runs.map((x) => x.editToPreview || 0));
          console.log(`| First Rendered PDF Preview | ${sFirstPrev.median} ms | ${sFirstPrev.worst} ms |`);
          console.log(`| Edit to Updated Preview | ${sEditPrev.median} ms | ${sEditPrev.worst} ms |`);
        }
        console.log('\n');
      }
    }

    await browser.close();
  } catch (err) {
    console.error('[Benchmark Error]:', err);
  } finally {
    if (testUserId) {
      console.log('[Cleanup] Deleting benchmark test data...');
      try {
        if (docId) {
          await adminClient.from('document_sections').delete().eq('document_id', docId);
          await adminClient.from('documents').delete().eq('id', docId);
        }
        await adminClient.from('master_profiles').delete().eq('user_id', testUserId);
        await adminClient.auth.admin.deleteUser(testUserId);
      } catch {}
      console.log('[Cleanup] Benchmark cleanup complete.');
    }
    if (spawnedServer && spawnedServer.pid) {
      console.log('[Server] Terminating spawned test server...');
      if (process.platform === 'win32') {
        try {
          spawn('taskkill', ['/pid', spawnedServer.pid.toString(), '/f', '/t']);
        } catch {}
      } else {
        spawnedServer.kill('SIGTERM');
      }
    }
  }
}

main().catch(console.error);
