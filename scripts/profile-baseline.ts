import { chromium, CDPSession } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { spawn, execSync, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
assertTestProjectRefAllowed();

interface ModuleStat {
  sourcePath: string;
  parsedBytes: number;
  gzipBytes: number;
}

function getTopModulesForRoute(route: string): {
  totalParsedBytes: number;
  totalGzipBytes: number;
  top10: ModuleStat[];
  flags: string[];
} {
  const out = execSync(`npx next analyze export --route "${route}"`, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const bySource = new Map<string, { parsed: number; gzip: number }>();
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line);
    if (
      obj.type === 'part' &&
      typeof obj.filename === 'string' &&
      obj.filename.startsWith('[client-fs]/') &&
      obj.filename.endsWith('.js')
    ) {
      const sp = String(obj.source_path || 'unknown');
      const prev = bySource.get(sp) || { parsed: 0, gzip: 0 };
      prev.parsed += Number(obj.size || 0);
      prev.gzip += Number(obj.compressed_size || 0);
      bySource.set(sp, prev);
    }
  }

  let totalParsedBytes = 0;
  let totalGzipBytes = 0;
  const list: ModuleStat[] = [];
  for (const [sourcePath, stats] of bySource.entries()) {
    totalParsedBytes += stats.parsed;
    totalGzipBytes += stats.gzip;
    list.push({ sourcePath, parsedBytes: stats.parsed, gzipBytes: stats.gzip });
  }
  list.sort((a, b) => b.gzipBytes - a.gzipBytes);

  const flags: string[] = [];
  const allPaths = list.map((m) => m.sourcePath.toLowerCase());
  if (allPaths.some((p) => p.includes('@supabase'))) flags.push('supabase');
  if (allPaths.some((p) => p.includes('@dnd-kit'))) flags.push('dnd-kit');
  if (allPaths.some((p) => p.includes('@react-pdf') || p.includes('fontkit') || p.includes('pdfkit')))
    flags.push('react-pdf');
  if (allPaths.some((p) => p.includes('pdfjs-dist'))) flags.push('pdfjs-dist');
  if (allPaths.some((p) => p.includes('documenteditor') || p.includes('livepdfpreview')))
    flags.push('editor');

  return {
    totalParsedBytes,
    totalGzipBytes,
    top10: list.slice(0, 10),
    flags,
  };
}

interface TraceCategories {
  scriptingMs: number;
  layoutStyleMs: number;
  paintingMs: number;
  loadingParseMs: number;
  otherMs: number;
  totalMainThreadMs: number;
}

function summarizeTrace(events: any[]): TraceCategories {
  // Find CrRendererMain thread
  const rendererThreads = new Set<string>();
  for (const e of events) {
    if (e.name === 'thread_name' && e.args?.name === 'CrRendererMain') {
      rendererThreads.add(`${e.pid}:${e.tid}`);
    }
  }

  const scriptingNames = new Set([
    'EvaluateScript',
    'FunctionCall',
    'v8.callFunction',
    'EventDispatch',
    'TimerFire',
    'FireAnimationFrame',
    'Microtasks',
    'RunMicrotasks',
    'V8.Execute',
  ]);
  const layoutNames = new Set([
    'Layout',
    'UpdateLayoutTree',
    'RecalculateStyles',
    'InvalidateLayout',
    'ScheduleStyleRecalculation',
  ]);
  const paintNames = new Set(['Paint', 'CompositeLayers', 'RasterTask', 'UpdateLayerTree', 'HitTest']);
  const loadingNames = new Set(['ParseHTML', 'ParseAuthorStyleSheet', 'v8.compile', 'v8.compileModule', 'V8.Compile']);

  let scriptingUs = 0;
  let layoutUs = 0;
  let paintUs = 0;
  let loadingUs = 0;
  let otherUs = 0;

  // Use top-level non-nested duration approximation or sum leaf-safe categories
  // Specifically sum only events on CrRendererMain with dur > 0 that are top-level or leaf categories
  const mainEvents = events.filter(
    (e) =>
      e.ph === 'X' &&
      typeof e.dur === 'number' &&
      e.dur > 0 &&
      (rendererThreads.size === 0 || rendererThreads.has(`${e.pid}:${e.tid}`))
  );

  for (const e of mainEvents) {
    if (scriptingNames.has(e.name)) scriptingUs += e.dur;
    else if (layoutNames.has(e.name)) layoutUs += e.dur;
    else if (paintNames.has(e.name)) paintUs += e.dur;
    else if (loadingNames.has(e.name)) loadingUs += e.dur;
    else if (e.name === 'ThreadControllerImpl::RunTask') otherUs += e.dur;
  }

  const accountedUs = scriptingUs + layoutUs + paintUs + loadingUs;
  const remOtherUs = Math.max(0, otherUs - accountedUs);
  const totalUs = accountedUs + remOtherUs;

  const r = (us: number) => Math.round((us / 1000) * 10) / 10;
  return {
    scriptingMs: r(scriptingUs),
    layoutStyleMs: r(layoutUs),
    paintingMs: r(paintUs),
    loadingParseMs: r(loadingUs),
    otherMs: r(remOtherUs),
    totalMainThreadMs: r(totalUs),
  };
}

async function collectTrace(client: CDPSession): Promise<any[]> {
  const chunks: any[] = [];
  client.on('Tracing.dataCollected', (payload: any) => {
    if (Array.isArray(payload?.value)) {
      chunks.push(...payload.value);
    }
  });
  await new Promise<void>((resolve) => {
    client.once('Tracing.tracingComplete', () => resolve());
    client.send('Tracing.end').catch(() => resolve());
  });
  return chunks;
}

async function main() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3100';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const lines: string[] = [];
  const log = (s: string) => {
    console.log(s);
    lines.push(s);
  };

  log('QUILLFOLIO PHASE 8I BASELINE PERFORMANCE PROFILE');
  log(`Generated: ${new Date().toISOString()}`);
  log('');

  // 1. Bundle analyzer top 10 JS modules per route
  log('================================================================');
  log('1. BUNDLE ANALYZER: TOP 10 CLIENT JS MODULES PER ROUTE');
  log('================================================================');
  for (const route of ['/', '/login', '/dashboard', '/editor/[documentId]']) {
    const stats = getTopModulesForRoute(route);
    log(
      `\nRoute: ${route} | Total Parsed: ${(stats.totalParsedBytes / 1024).toFixed(1)} KB | Total Gzip: ${(
        stats.totalGzipBytes / 1024
      ).toFixed(1)} KB | Flags: [${stats.flags.join(', ') || 'none'}]`
    );
    log('| # | Module | Parsed (KB) | Gzip (KB) |');
    log('|---:|:---|---:|---:|');
    stats.top10.forEach((m, i) => {
      const cleanName = m.sourcePath.replace(/^\[project\]\//, '');
      log(`| ${i + 1} | ${cleanName} | ${(m.parsedBytes / 1024).toFixed(2)} | ${(m.gzipBytes / 1024).toFixed(2)} |`);
    });
  }

  // 2. Start production server
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
    spawnedServer = spawn('npx', ['next', 'start', '-p', '3100'], { shell: true, stdio: 'pipe' });
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (await isServerUp()) break;
    }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const testEmail = `prof-${Date.now()}@quillfolio.local`;
  const testPassword = 'Password123!Profile';
  let testUserId = '';
  let docId = '';
  const capturedCookies: Record<string, string> = {};

  try {
    const { data: userRec, error: uErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Alex Profile' },
    });
    if (uErr) throw uErr;
    testUserId = userRec.user.id;

    const ssrClient = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll: () => Object.entries(capturedCookies).map(([name, value]) => ({ name, value })),
        setAll: (toSet) => toSet.forEach((c) => (capturedCookies[c.name] = c.value)),
      },
    });
    await ssrClient.auth.signInWithPassword({ email: testEmail, password: testPassword });

    await adminClient.from('master_profiles').insert({
      user_id: testUserId,
      full_name: 'Alex Profile',
      headline: 'Principal Infrastructure Architect',
      email: testEmail,
    });

    const { data: docRec } = await adminClient
      .from('documents')
      .insert({
        user_id: testUserId,
        title: 'Profile Candidate Resume',
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        version: 1,
      })
      .select('id')
      .single();
    docId = docRec!.id;

    await adminClient.from('document_sections').insert([
      {
        document_id: docId,
        section_type: 'header',
        title: 'Header',
        order_index: 0,
        is_visible: true,
        content: {
          fullName: 'Alex Profile',
          headline: 'Principal Infrastructure Architect',
          email: testEmail,
          otherLinks: [],
          schema_version: '1.0.0',
        },
      },
      {
        document_id: docId,
        section_type: 'summary',
        title: 'Summary',
        order_index: 1,
        is_visible: true,
        content: {
          text: 'Systems architect focused on distributed rendering and low-latency pipelines.',
          schema_version: '1.0.0',
        },
      },
    ]);

    const browser = await chromium.launch({ headless: true });
    const profiles = [
      { name: 'Unthrottled (Desktop 1440px)', throttled: false, width: 1440, height: 900 },
      { name: 'Mobile Throttled (4x CPU, Mid-Range 4G, 390px)', throttled: true, width: 390, height: 844 },
    ];
    const routes = [
      { label: '/', path: '/', isAuth: false },
      { label: '/login', path: '/login', isAuth: false },
      { label: '/dashboard', path: '/dashboard', isAuth: true },
      { label: '/editor/[id]', path: `/editor/${docId}`, isAuth: true },
    ];

    log('\n================================================================');
    log('2. CHROMIUM TRACING & CDP PROFILE (MAIN-THREAD + TRANSFER + PREVIEW)');
    log('================================================================');

    for (const prof of profiles) {
      log(`\n--- ${prof.name} ---`);
      for (const r of routes) {
        const context = await browser.newContext({ viewport: { width: prof.width, height: prof.height } });
        if (r.isAuth) {
          await context.addCookies(
            Object.entries(capturedCookies).map(([name, value]) => ({
              name,
              value,
              domain: 'localhost',
              path: '/',
              httpOnly: false,
              secure: false,
              sameSite: 'Lax' as const,
            }))
          );
        }
        const page = await context.newPage();
        const client = await context.newCDPSession(page);

        if (prof.throttled) {
          await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          await client.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: 150,
            downloadThroughput: (1.6 * 1024 * 1024) / 8,
            uploadThroughput: (750 * 1024) / 8,
          });
        }

        let jsBytes = 0;
        let fontBytes = 0;
        let workerBytes = 0;
        page.on('response', async (res) => {
          const url = res.url();
          const hdrs = res.headers();
          let len = parseInt(hdrs['content-length'] || '0', 10);
          if (!len) {
            try {
              len = (await res.body()).length;
            } catch {}
          }
          if (url.includes('.js') || url.includes('/_next/static/chunks/')) {
            if (url.includes('worker')) workerBytes += len;
            else jsBytes += len;
          } else if (url.includes('.ttf') || url.includes('.woff')) {
            fontBytes += len;
          }
        });

        await client.send('Tracing.start', {
          categories: 'devtools.timeline,v8.execute,blink.user_timing',
        });

        const navStart = performance.now();
        await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'load' });
        await page.waitForTimeout(250);

        let previewBreakdown: Record<string, number> | null = null;
        if (r.label === '/editor/[id]') {
          if (prof.width < 1024) {
            const btn = page.locator('button[aria-label="Live A4 Preview Tab"]');
            if (await btn.isVisible()) await btn.click();
          }
          await page.waitForSelector('#pdf-preview-canvas-container canvas', {
            state: 'attached',
            timeout: 45000,
          });
          const firstPreviewMs = Math.round(performance.now() - navStart);

          const resTimings = await page.evaluate(() => {
            const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            const js = entries.filter((e) => e.name.includes('/_next/static/chunks/') && e.name.endsWith('.js'));
            const fonts = entries.filter((e) => e.name.includes('/fonts/'));
            const worker = entries.filter((e) => e.name.includes('pdf.worker'));
            return {
              jsMinStart: js.length ? Math.min(...js.map((a) => a.startTime)) : 0,
              jsMaxEnd: js.length ? Math.max(...js.map((a) => a.responseEnd)) : 0,
              fontFetchStartMs: fonts.length ? Math.round(Math.min(...fonts.map((a) => a.startTime))) : 0,
              fontFetchEndMs: fonts.length ? Math.round(Math.max(...fonts.map((a) => a.responseEnd))) : 0,
              workerStartMs: worker.length ? Math.round(Math.min(...worker.map((a) => a.startTime))) : 0,
              workerEndMs: worker.length ? Math.round(Math.max(...worker.map((a) => a.responseEnd))) : 0,
            };
          });

          const jsDownloadSpanMs = Math.round(resTimings.jsMaxEnd - resTimings.jsMinStart);
          const fontFetchSpanMs = Math.max(0, resTimings.fontFetchEndMs - resTimings.fontFetchStartMs);
          const workerFetchSpanMs = Math.max(0, resTimings.workerEndMs - resTimings.workerStartMs);

          const traceEventsPre = await collectTrace(client);
          const cats = summarizeTrace(traceEventsPre);
          const chunkDownloadAndParseMs = Math.max(jsDownloadSpanMs, cats.loadingParseMs);
          const reactPdfLayoutMs = Math.max(
            0,
            resTimings.workerStartMs - Math.max(resTimings.fontFetchEndMs, resTimings.fontFetchStartMs)
          );
          const pdfjsWorkerStartMs = workerFetchSpanMs;
          const pdfjsRenderMs = Math.max(0, firstPreviewMs - resTimings.workerEndMs);

          previewBreakdown = {
            firstPreviewMs,
            chunkDownloadAndParseMs,
            fontFetchAndParseMs: fontFetchSpanMs,
            reactPdfLayoutMs,
            pdfjsWorkerStartMs,
            pdfjsRenderMs,
          };

          log(
            `Route ${r.label}: JS=${(jsBytes / 1024).toFixed(1)} KB, Fonts=${(fontBytes / 1024).toFixed(
              1
            )} KB, Worker=${(workerBytes / 1024).toFixed(1)} KB | MainThread total=${
              cats.totalMainThreadMs
            }ms (Scripting=${cats.scriptingMs}ms, Layout/Style=${cats.layoutStyleMs}ms, Paint=${
              cats.paintingMs
            }ms, Parse/Compile=${cats.loadingParseMs}ms, Other=${cats.otherMs}ms)`
          );
          log(
            `  First PDF Preview Breakdown (Total=${previewBreakdown.firstPreviewMs}ms): chunkDownload+Parse=${previewBreakdown.chunkDownloadAndParseMs}ms, fontFetch+Parse=${previewBreakdown.fontFetchAndParseMs}ms, reactPdfLayout=${previewBreakdown.reactPdfLayoutMs}ms, pdfjsWorkerStart=${previewBreakdown.pdfjsWorkerStartMs}ms, pdfjsRender=${previewBreakdown.pdfjsRenderMs}ms`
          );
        } else {
          const traceEvents = await collectTrace(client);
          const cats = summarizeTrace(traceEvents);
          log(
            `Route ${r.label}: JS=${(jsBytes / 1024).toFixed(1)} KB, Fonts=${(fontBytes / 1024).toFixed(
              1
            )} KB | MainThread total=${cats.totalMainThreadMs}ms (Scripting=${cats.scriptingMs}ms, Layout/Style=${
              cats.layoutStyleMs
            }ms, Paint=${cats.paintingMs}ms, Parse/Compile=${cats.loadingParseMs}ms, Other=${cats.otherMs}ms)`
          );
        }

        await context.close();
      }
    }

    await browser.close();
  } finally {
    if (testUserId) {
      if (docId) {
        await adminClient.from('document_sections').delete().eq('document_id', docId);
        await adminClient.from('documents').delete().eq('id', docId);
      }
      await adminClient.from('master_profiles').delete().eq('user_id', testUserId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
    if (spawnedServer?.pid && process.platform === 'win32') {
      spawn('taskkill', ['/pid', spawnedServer.pid.toString(), '/f', '/t']);
    }
  }

  fs.mkdirSync(path.resolve(process.cwd(), 'reports'), { recursive: true });
  fs.writeFileSync(path.resolve(process.cwd(), 'reports/perf-profile.txt'), lines.join('\n') + '\n', 'utf8');
  console.log('\nSaved reports/perf-profile.txt');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
