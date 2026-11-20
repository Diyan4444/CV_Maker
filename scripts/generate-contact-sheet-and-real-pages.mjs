import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const outDir = path.resolve(process.cwd(), 'screenshots/colorfield');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const recipes = [
  { id: 'profile', name: 'Profile', palettes: 'P1 top-left + P4 bottom-right' },
  { id: 'dashboard', name: 'Dashboard', palettes: 'P1, P2, P3 120° around center (no P4)' },
  { id: 'onboarding', name: 'Onboarding', palettes: 'P1 TL, P2 TR, P3 BL, P4 BR' },
  { id: 'landing', name: 'Landing', palettes: 'P1 TR, P3 BL, P4 center wash' },
  { id: 'login', name: 'Login', palettes: 'P3 top-left, P4 bottom-right' },
  { id: 'website', name: 'Website', palettes: 'P1 top-left, P2 bottom-right' },
  { id: 'editor', name: 'Editor (Calm)', palettes: 'P3 + P4, calm mode' },
  { id: 'calm', name: 'Calm / Default', palettes: 'P4 + P3, calm' },
];

async function measureFrames(page, frameCount = 120) {
  return await page.evaluate((count) => {
    return new Promise((resolve) => {
      const times = [];
      let last = performance.now();
      let frames = 0;

      function step() {
        const now = performance.now();
        const delta = now - last;
        last = now;
        times.push(delta);
        frames++;
        if (frames < count) {
          requestAnimationFrame(step);
        } else {
          const sample = times.slice(2);
          sample.sort((a, b) => a - b);
          const sum = sample.reduce((a, b) => a + b, 0);
          const avg = sum / sample.length;
          const min = sample[0];
          const max = sample[sample.length - 1];
          const p95 = sample[Math.floor(sample.length * 0.95)];
          const fps = 1000 / avg;
          resolve({ avg, min, max, p95, fps, count: sample.length });
        }
      }
      requestAnimationFrame(step);
    });
  }, frameCount);
}

async function run() {
  console.log('=== Step 1: Launch Playwright & Query WebGL Debug Info ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  await page.goto('http://localhost:3000/dev/backgrounds?recipe=profile&pure=1', {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(600);

  // Query WebGL Debug Info
  const debugInfo = await page.evaluate(() => {
    const dbg = window.__colorfield_debug;
    return dbg ? dbg.rendererInfo : null;
  });

  console.log('WebGL Debug Info:', debugInfo);

  console.log('\n=== Step 2: GPU Headroom & Render Scale Benchmarks ===');
  const scales = [0.5, 1.0, 2.0, 4.0];
  const scaleResults = {};

  for (const s of scales) {
    console.log(`Testing render scale ${s}x...`);
    await page.evaluate((scale) => {
      if (window.__colorfield_debug) {
        window.__colorfield_debug.setScale(scale);
      }
    }, s);
    await page.waitForTimeout(300);

    const perf = await measureFrames(page, 120);
    scaleResults[`${s}x`] = {
      scale: s,
      avgMs: Number(perf.avg.toFixed(2)),
      p95Ms: Number(perf.p95.toFixed(2)),
      minMs: Number(perf.min.toFixed(2)),
      maxMs: Number(perf.max.toFixed(2)),
      fps: Number(perf.fps.toFixed(1)),
    };
    console.log(`Results for ${s}x:`, scaleResults[`${s}x`]);
  }

  // Reset scale to 0.5x
  await page.evaluate(() => {
    if (window.__colorfield_debug) window.__colorfield_debug.setScale(0.5);
  });

  console.log('\n=== Step 3: Energy Management Benchmarking ===');
  // Active pointer movement
  for (let i = 0; i < 25; i++) {
    await page.mouse.move(200 + i * 15, 200 + i * 15);
    await page.waitForTimeout(30);
  }
  const activeDrawRate = await page.evaluate(() => {
    return window.__colorfield_debug ? window.__colorfield_debug.getDrawRate() : null;
  });
  console.log('Active Pointer WebGL Draw Rate (60fps expected):', activeDrawRate);

  // Wait 5.5 seconds without pointer events (idle throttling to ~30fps)
  console.log('Waiting 5.5 seconds to trigger energy idle state...');
  await page.waitForTimeout(5500);
  const idleDrawRate = await page.evaluate(() => {
    return window.__colorfield_debug ? window.__colorfield_debug.getDrawRate() : null;
  });
  console.log('Idle Pointer WebGL Draw Rate (~30fps expected):', idleDrawRate);

  const perfReport = {
    webglInfo: debugInfo,
    headroomScaling: scaleResults,
    energyManagement: {
      active: activeDrawRate,
      idle5s: idleDrawRate,
    },
  };

  fs.writeFileSync(
    path.join(outDir, 'perf-headroom-report.json'),
    JSON.stringify(perfReport, null, 2)
  );

  await page.close();

  console.log('\n=== Step 4: Capture Real App Pages in Context ===');
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testEmail = `realpage-test-${Date.now()}@quillfolio.local`;
  const testPassword = 'RealPagePass123!';

  const { data: userRecord, error: userErr } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Visual Review User' },
  });
  if (userErr) throw userErr;
  const userId = userRecord.user.id;

  await adminClient.from('master_profiles').insert({
    user_id: userId,
    background_group: 'engineering_technology',
    specialization: 'Computer Science Engineering',
    headline: 'Software Engineer & Systems Builder',
    summary: 'Fresh graduate profile displayed cleanly over the dynamic procedural ColorField background.',
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

  const realPagesContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
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
  await realPagesContext.addCookies(cookieEntries);

  const realPages = [
    { url: 'http://localhost:3000/', filename: 'real_page_landing.png' },
    { url: 'http://localhost:3000/login', filename: 'real_page_login.png' },
    { url: 'http://localhost:3000/onboarding', filename: 'real_page_onboarding.png' },
    { url: 'http://localhost:3000/dashboard', filename: 'real_page_dashboard.png' },
    { url: 'http://localhost:3000/profile', filename: 'real_page_profile.png' },
  ];

  for (const item of realPages) {
    console.log(`Capturing real page: ${item.url}...`);
    const p = await realPagesContext.newPage();
    await p.goto(item.url, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    await p.screenshot({
      path: path.join(outDir, item.filename),
      fullPage: true,
    });
    await p.close();
  }

  await realPagesContext.close();
  await adminClient.auth.admin.deleteUser(userId);

  console.log('\n=== Step 5: Capture All 8 Recipes in 3 States for Contact Sheet ===');
  const panelBuffers = []; // will store base64 data for stitching

  for (const r of recipes) {
    console.log(`Capturing states for recipe: ${r.id}...`);
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const p = await ctx.newPage();
    await p.goto(`http://localhost:3000/dev/backgrounds?recipe=${r.id}&pure=1`, {
      waitUntil: 'networkidle',
    });
    await p.waitForTimeout(400);

    // State 1: t=0
    const b1 = await p.screenshot();

    // State 2: cursor top-left (144, 90)
    await p.mouse.move(144, 90);
    await p.waitForTimeout(300);
    const b2 = await p.screenshot();

    // State 3: cursor bottom-right (1296, 810)
    await p.mouse.move(1296, 810);
    await p.waitForTimeout(300);
    const b3 = await p.screenshot();

    panelBuffers.push({
      recipe: r,
      states: [
        { label: 't=0 (initial)', buffer: b1.toString('base64') },
        { label: 'Cursor Top-Left (0.1, 0.1)', buffer: b2.toString('base64') },
        { label: 'Cursor Bottom-Right (0.9, 0.9)', buffer: b3.toString('base64') },
      ],
    });

    await ctx.close();
  }

  console.log('\n=== Step 6: Render High-Resolution Contact Sheet ===');
  // Use a canvas in a headless page to assemble the 8x3 grid cleanly
  const stitchPage = await browser.newPage({
    viewport: { width: 2000, height: 4200 },
  });

  const contactSheetHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { margin: 0; background: #0B0B0B; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .header { padding: 32px 40px; border-bottom: 2px solid #333333; }
        h1 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #FFFFFF; }
        p { margin: 0; font-size: 14px; color: #D9D9D9; }
        .grid { padding: 32px 40px; display: flex; flex-direction: column; gap: 40px; }
        .recipe-row { background: #1A1A1A; border: 1px solid #333333; border-radius: 12px; padding: 24px; }
        .recipe-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; color: #FFFFFF; }
        .recipe-subtitle { font-size: 12px; color: #D5E5E5; margin-bottom: 16px; }
        .columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .panel { display: flex; flex-direction: column; gap: 8px; }
        .panel-label { font-size: 12px; font-weight: 600; color: #D9D9D9; text-transform: uppercase; letter-spacing: 0.5px; }
        .panel-img { width: 100%; aspect-ratio: 16/10; object-fit: cover; border-radius: 6px; border: 1px solid #333333; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ColorField Recipe Contact Sheet</h1>
        <p>Comprehensive visual review of all 8 recipes at 1440px in 3 interaction states: t=0, cursor top-left, and cursor bottom-right.</p>
      </div>
      <div class="grid">
        ${panelBuffers
          .map(
            (p) => `
          <div class="recipe-row">
            <div class="recipe-title">${p.recipe.name} (${p.recipe.id})</div>
            <div class="recipe-subtitle">Palettes: ${p.recipe.palettes}</div>
            <div class="columns">
              ${p.states
                .map(
                  (s) => `
                <div class="panel">
                  <div class="panel-label">${s.label}</div>
                  <img class="panel-img" src="data:image/png;base64,${s.buffer}" />
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </body>
    </html>
  `;

  await stitchPage.setContent(contactSheetHtml, { waitUntil: 'load' });
  await stitchPage.waitForTimeout(1000);

  const contactSheetPath = path.join(outDir, 'contact_sheet.png');
  await stitchPage.screenshot({
    path: contactSheetPath,
    fullPage: true,
  });

  console.log(`\nContact sheet successfully written to: ${contactSheetPath}`);

  await browser.close();
  console.log('=== All tasks finished cleanly! ===');
}

run().catch((e) => {
  console.error('Error running contact sheet script:', e);
  process.exit(1);
});
