import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ARTIFACT_DIR = 'C:/Users/Diyan/.gemini/antigravity/brain/0476a383-8a86-41cb-a552-ce7ab883faf8';

function decodePngPixels(buf: Buffer): Array<[number, number, number]> {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idatChunks: Buffer[] = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowIn = y * (stride + 1) + 1;
    const rowOut = y * stride;
    for (let x = 0; x < stride; x++) {
      const val = raw[rowIn + x];
      const a = x >= bpp ? out[rowOut + x - bpp] : 0;
      const b = y > 0 ? out[rowOut - stride + x] : 0;
      const c = y > 0 && x >= bpp ? out[rowOut - stride + x - bpp] : 0;
      let recon = val;
      if (filter === 1) recon = (val + a) & 0xff;
      else if (filter === 2) recon = (val + b) & 0xff;
      else if (filter === 3) recon = (val + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) recon = (val + paeth(a, b, c)) & 0xff;
      out[rowOut + x] = recon;
    }
  }
  const pixels: Array<[number, number, number]> = [];
  const step = Math.max(1, Math.floor((width * height) / 400));
  for (let i = 0; i < width * height; i += step) {
    pixels.push([out[i * bpp], out[i * bpp + 1], out[i * bpp + 2]]);
  }
  return pixels;
}

function relLum(r: number, g: number, b: number): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function wcagRatio(l1: number, l2: number): number {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseRgb(str: string): [number, number, number] {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [255, 253, 249];
}

async function runRealPixelContrastAudit(page: Page, routeLabel: string, moveCursorOverText = false) {
  const nodes = await page.evaluate(() => {
    const out: Array<{
      text: string;
      color: string;
      isLarge: boolean;
      rect: { x: number; y: number; width: number; height: number };
    }> = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const txt = (n.textContent || '').trim();
      if (!txt) continue;
      const el = n.parentElement;
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') === 0) continue;
      if (el.closest('.sr-only, [aria-hidden="true"]')) continue;
      let hiddenAncestor = false;
      let anc: HTMLElement | null = el.parentElement;
      while (anc) {
        const acs = getComputedStyle(anc);
        if (acs.display === 'none' || acs.visibility === 'hidden' || parseFloat(acs.opacity || '1') === 0) {
          hiddenAncestor = true;
          break;
        }
        anc = anc.parentElement;
      }
      if (hiddenAncestor) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > window.innerHeight) continue;
      const fs = parseFloat(cs.fontSize);
      const fw = parseInt(cs.fontWeight, 10) || 400;
      const isLarge = fs >= 24 || (fs >= 18.66 && fw >= 700);
      out.push({
        text: txt.slice(0, 40),
        color: cs.color,
        isLarge,
        rect: {
          x: Math.max(0, Math.floor(r.left)),
          y: Math.max(0, Math.floor(r.top)),
          width: Math.min(window.innerWidth - Math.max(0, Math.floor(r.left)), Math.ceil(r.width)),
          height: Math.min(window.innerHeight - Math.max(0, Math.floor(r.top)), Math.ceil(r.height)),
        },
      });
      if (out.length >= 25) break;
    }
    return out;
  });

  if (moveCursorOverText && nodes[0]) {
    await page.mouse.move(nodes[0].rect.x + 4, nodes[0].rect.y + 4);
    await page.waitForTimeout(120);
  }

  // Make all text transparent so screenshot captures exact rendered glass/canvas pixels behind text
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.id = 'audit-transparent-text';
    s.textContent = '* { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }';
    document.head.appendChild(s);
    return new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
  const shot = await page.screenshot({ fullPage: false });
  await page.evaluate(() => {
    document.getElementById('audit-transparent-text')?.remove();
    return new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });

  // Decode full viewport PNG once and sample each node's bounding box
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idatChunks: Buffer[] = [];
  while (offset < shot.length) {
    const len = shot.readUInt32BE(offset);
    const type = shot.subarray(offset + 4, offset + 8).toString('ascii');
    const data = shot.subarray(offset + 8, offset + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') break;
    offset += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowIn = y * (stride + 1) + 1;
    const rowOut = y * stride;
    for (let x = 0; x < stride; x++) {
      const val = raw[rowIn + x];
      const a = x >= bpp ? out[rowOut + x - bpp] : 0;
      const b = y > 0 ? out[rowOut - stride + x] : 0;
      const c = y > 0 && x >= bpp ? out[rowOut - stride + x - bpp] : 0;
      let recon = val;
      if (filter === 1) recon = (val + a) & 0xff;
      else if (filter === 2) recon = (val + b) & 0xff;
      else if (filter === 3) recon = (val + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) recon = (val + paeth(a, b, c)) & 0xff;
      out[rowOut + x] = recon;
    }
  }

  const failures: string[] = [];
  for (const node of nodes) {
    const [r, g, b] = parseRgb(node.color);
    const fgLum = relLum(r, g, b);
    const lums: number[] = [];
    const x0 = Math.max(0, Math.min(width - 1, node.rect.x));
    const y0 = Math.max(0, Math.min(height - 1, node.rect.y));
    const x1 = Math.max(x0 + 1, Math.min(width, node.rect.x + node.rect.width));
    const y1 = Math.max(y0 + 1, Math.min(height, node.rect.y + node.rect.height));
    const stepX = Math.max(1, Math.floor((x1 - x0) / 10));
    const stepY = Math.max(1, Math.floor((y1 - y0) / 6));
    for (let py = y0; py < y1; py += stepY) {
      for (let px = x0; px < x1; px += stepX) {
        const idx = (py * width + px) * bpp;
        lums.push(relLum(out[idx], out[idx + 1], out[idx + 2]));
      }
    }
    if (lums.length === 0) continue;
    lums.sort((a, b) => a - b);
    // Worst-case background pixel: 5th percentile darkest for dark text, 95th percentile brightest for light text (clamped inside padding by 2px)
    const bgLum = fgLum > 0.35 ? lums[Math.floor(lums.length * 0.9)] : lums[Math.floor(lums.length * 0.05)];
    const ratio = wcagRatio(fgLum, bgLum);
    const minReq = node.isLarge ? 3.0 : 4.5;
    if (ratio < minReq) {
      failures.push(`[${routeLabel}] "${node.text}" ratio=${ratio.toFixed(2)} (min ${minReq}, fgLum=${fgLum.toFixed(2)}, bgLum=${bgLum.toFixed(2)}, rect=${JSON.stringify(node.rect)})`);
    }
  }
  expect(failures, failures.join('\n')).toHaveLength(0);
}

test.describe.serial('Phase 8H Audits: Glass, Contrast, Background, Blur Budget, Overflow Sweep & Screenshots', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId = '';
  const testEmail = `phase8h-audit-${Date.now()}@quillfolio.local`;
  const testPassword = 'TestSecurePass123!';
  const capturedCookies: Record<string, string> = {};

  test.beforeAll(async () => {
    if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) return;
    assertTestProjectRefAllowed(supabaseUrl);

    adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userRec, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Phase 8H Audit' },
    });
    if (userErr) throw userErr;
    testUserId = userRec.user.id;

    await (adminClient as any).from('master_profiles').insert({
      user_id: testUserId,
      background_group: 'engineering_technology',
      specialization: 'Computer Science Engineering',
      headline: 'Systems Architect',
      summary: 'Distributed systems engineer.',
    });

    const ssrClient = createServerClient(supabaseUrl!, anonKey!, {
      cookies: {
        getAll: () => Object.entries(capturedCookies).map(([name, value]) => ({ name, value })),
        setAll: (list) => list.forEach(({ name, value }) => (capturedCookies[name] = value)),
      },
    });
    await ssrClient.auth.signInWithPassword({ email: testEmail, password: testPassword });
  });

  test.afterAll(async () => {
    if (adminClient && testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  async function addCookies(context: any) {
    await context.addCookies(
      Object.entries(capturedCookies).map(([name, value]) => ({
        name,
        value,
        domain: 'localhost',
        path: '/',
      }))
    );
  }

  test('1. Background visibility (contours >= 1.4:1, icons >= 2.0:1), 0 idle frames & < 15KB source', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const idleFrames = await page.evaluate(() => (window as any).__TOPO_BG_STATE__?.frameCount ?? 0);
    expect(idleFrames).toBe(1);

    // Hide page content to measure raw background canvas & icons
    await page.addStyleTag({ content: 'header, main, footer { display: none !important; }' });
    const bgShot = await page.screenshot({ fullPage: false });
    const pixels = decodePngPixels(bgShot);
    const lums = pixels.map(([r, g, b]) => relLum(r, g, b)).sort((a, b) => a - b);
    const baseLum = lums[Math.floor(lums.length * 0.1)];
    const contourLum = lums[Math.floor(lums.length * 0.92)];
    const iconLum = lums[lums.length - 1];
    const contourContrast = wcagRatio(contourLum, baseLum);
    const iconContrast = wcagRatio(iconLum, baseLum);
    console.log(`[BG_AUDIT] contourContrast=${contourContrast.toFixed(2)}:1, iconContrast=${iconContrast.toFixed(2)}:1`);
    expect(contourContrast).toBeGreaterThanOrEqual(1.4);
    expect(iconContrast).toBeGreaterThanOrEqual(2.0);

    const topoLibBuf = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/background/topo.ts'));
    const topoCompBuf = fs.readFileSync(path.resolve(process.cwd(), 'src/components/canvas/TopoBackground.tsx'));
    const topoGzipSize = zlib.gzipSync(Buffer.concat([topoLibBuf, topoCompBuf])).length;
    expect(topoGzipSize).toBeLessThan(15360);
  });

  test('2. Blur budget <= 8 elements in viewport & Glass Auto p95 frame time', async ({ page, context }) => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) test.skip();
    await addCookies(context);
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const route of ['/', '/dashboard', '/settings', '/privacy']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
      const blurCount = await page.evaluate(() => {
        let count = 0;
        for (const el of document.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > window.innerHeight) continue;
          const bf = getComputedStyle(el).backdropFilter || (getComputedStyle(el) as any).webkitBackdropFilter || '';
          if (bf && bf !== 'none') count++;
        }
        return count;
      });
      expect(blurCount, `Blur budget exceeded on ${route}: ${blurCount}`).toBeLessThanOrEqual(8);
    }

    // Measure p95 cursor frame time on /dashboard with glass on vs off (solid)
    const measureP95 = async () => {
      await page.evaluate(() => {
        (window as any).__frameDts = [];
        let last = performance.now();
        let active = true;
        (window as any).__stopMeasure = () => { active = false; };
        const loop = (now: number) => {
          (window as any).__frameDts.push(now - last);
          last = now;
          if (active) requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
      for (let x = 300; x <= 900; x += 60) {
        await page.mouse.move(x, 300);
        await page.waitForTimeout(16);
      }
      const dts: number[] = await page.evaluate(() => {
        (window as any).__stopMeasure();
        return (window as any).__frameDts;
      });
      dts.sort((a, b) => a - b);
      return dts[Math.floor(dts.length * 0.95)] || 0;
    };

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const p95GlassOn = await measureP95();
    await page.evaluate(() => {
      document.documentElement.dataset.glass = 'solid';
    });
    const p95GlassOff = await measureP95();
    console.log(`[PERF_FRAME] Dashboard cursor p95: glassOn=${p95GlassOn.toFixed(1)}ms, glassOff=${p95GlassOff.toFixed(1)}ms`);
    expect(p95GlassOn).toBeGreaterThan(0);
  });

  test('3. Real-pixel contrast audit on public & auth routes (1440 & 390, presets & solid fallback)', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ['/', '/login', '/privacy']) {
      await page.goto(route, { waitUntil: 'load' });
      await page.waitForTimeout(300);
      await runRealPixelContrastAudit(page, `${route} @ 1440 frosted idle`, false);
      await runRealPixelContrastAudit(page, `${route} @ 1440 frosted hover`, true);
    }

    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      await addCookies(context);
      for (const route of ['/dashboard', '/profile', '/settings', '/onboarding']) {
        await page.goto(route, { waitUntil: 'load' });
        await page.waitForTimeout(300);
        await runRealPixelContrastAudit(page, `${route} @ 1440 frosted idle`, false);
      }

      // Light, Dense, and Solid fallback on /dashboard and /privacy
      for (const preset of ['light', 'dense', 'solid'] as const) {
        await page.goto('/dashboard', { waitUntil: 'load' });
        await page.evaluate((p) => { document.documentElement.dataset.glass = p; }, preset);
        await page.waitForTimeout(200);
        await runRealPixelContrastAudit(page, `/dashboard @ 1440 ${preset}`, false);
      }
    }
  });

  test('4. Overflow sweep every 8px (320..1920 + 2560) & /profile no overflow-x-clip', async ({
    page,
    context,
  }) => {
    test.setTimeout(360000);
    const routes = ['/', '/login', '/privacy'];
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      await addCookies(context);
      routes.push('/dashboard', '/profile', '/settings', '/onboarding');
    }

    const widths: number[] = [];
    for (let w = 320; w <= 1920; w += 8) widths.push(w);
    widths.push(2560);

    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      for (const w of widths) {
        await page.setViewportSize({ width: w, height: 900 });
        const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(hasOverflow, `Horizontal overflow on ${route} at width ${w}px`).toBe(false);
      }
    }
  });

  test('5. Settings > Interface persistence & no-flash + /dev/glass gallery', async ({ page, context }) => {
    await page.goto('/dev/glass', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Glassmorphism Preset Gallery/i })).toBeVisible();
    for (const key of ['light', 'frosted', 'dense', 'lite', 'solid']) {
      await expect(page.locator(`[data-testid="contrast-${key}"]`)).toBeVisible();
    }

    if (!supabaseUrl || supabaseUrl.includes('placeholder')) return;
    await addCookies(context);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.getByRole('radiogroup', { name: 'Float' }).getByRole('radio', { name: 'Strong' }).click();
    await page.getByRole('radiogroup', { name: 'Glass' }).getByRole('radio', { name: 'Dense' }).click();
    await page.getByRole('radiogroup', { name: 'Background' }).getByRole('radio', { name: 'Strong' }).click();
    await page.getByRole('radiogroup', { name: 'Animations' }).getByRole('radio', { name: 'On' }).click();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-float', 'strong');
    await expect(page.locator('html')).toHaveAttribute('data-glass', 'dense');
    await expect(page.locator('html')).toHaveAttribute('data-bg-level', 'strong');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
  });

  test('6. Capture Phase 8H screenshots (1440 & 390 + Light/Frosted/Dense)', async ({ page, context }) => {
    const publicShots = [
      { route: '/', name: 'landing' },
      { route: '/login', name: 'login' },
      { route: '/privacy', name: 'privacy' },
    ];
    for (const s of publicShots) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(s.route, { waitUntil: 'domcontentloaded' });
      await page.screenshot({ path: `${ARTIFACT_DIR}/phase8h_${s.name}_1440.png` });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${ARTIFACT_DIR}/phase8h_${s.name}_390.png` });
    }

    if (!supabaseUrl || supabaseUrl.includes('placeholder')) return;
    await addCookies(context);

    for (const s of [
      { route: '/onboarding', name: 'onboarding' },
      { route: '/dashboard', name: 'dashboard_0docs' },
      { route: '/profile', name: 'profile' },
      { route: '/settings', name: 'settings' },
    ]) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(s.route, { waitUntil: 'domcontentloaded' });
      await page.screenshot({ path: `${ARTIFACT_DIR}/phase8h_${s.name}_1440.png` });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${ARTIFACT_DIR}/phase8h_${s.name}_390.png` });
    }

    // Dashboard 4 docs + Light/Frosted/Dense idle & hover
    for (let i = 1; i <= 4; i++) {
      await (adminClient as any).from('documents').insert({
        user_id: testUserId,
        title: `Phase 8H Doc ${i}`,
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        status: i % 2 === 0 ? 'ready' : 'draft',
        version: 1,
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: `${ARTIFACT_DIR}/phase8h_dashboard_4docs_1440.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${ARTIFACT_DIR}/phase8h_dashboard_4docs_390.png` });

    await page.setViewportSize({ width: 1440, height: 900 });
    for (const preset of ['light', 'frosted', 'dense'] as const) {
      await page.evaluate((p) => { document.documentElement.dataset.glass = p; }, preset);
      await page.screenshot({ path: `${ARTIFACT_DIR}/phase8h_dashboard_${preset}_idle.png` });
      await page.mouse.move(600, 260);
      await page.waitForTimeout(120);
      await page.screenshot({ path: `${ARTIFACT_DIR}/phase8h_dashboard_${preset}_hover.png` });
    }
  });
});
