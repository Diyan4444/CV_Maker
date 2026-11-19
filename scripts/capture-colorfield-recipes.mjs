import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const outDir = path.resolve(process.cwd(), 'screenshots/colorfield');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const recipes = [
  'profile',
  'dashboard',
  'onboarding',
  'landing',
  'login',
  'website',
  'editor',
  'calm',
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
          // Drop first 2 warmup frames
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
  console.log('--- ColorField Visual Capture & Performance Measurement ---');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl'], // ensure WebGL is active in headless Chromium
  });

  // 1. Overview gallery page
  console.log('\nCapturing Dev Gallery overview at 1440px...');
  const overviewContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const overviewPage = await overviewContext.newPage();
  await overviewPage.goto('http://localhost:3000/dev/backgrounds', { waitUntil: 'networkidle' });
  await overviewPage.waitForTimeout(500);
  await overviewPage.screenshot({
    path: path.join(outDir, '00_dev_gallery_overview.png'),
    fullPage: true,
  });
  await overviewContext.close();

  // 2. Measure Frame Times (Standard vs 4x Throttled)
  console.log('\nMeasuring frame performance at 1440px on /dev/backgrounds?recipe=profile&pure=1...');
  const perfContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const perfPage = await perfContext.newPage();
  await perfPage.goto('http://localhost:3000/dev/backgrounds?recipe=profile&pure=1', {
    waitUntil: 'networkidle',
  });
  await perfPage.waitForTimeout(500);

  // Normal performance
  const normalPerf = await measureFrames(perfPage, 120);
  console.log('Standard 1440px Frame Performance:', {
    avgMs: Number(normalPerf.avg.toFixed(2)),
    p95Ms: Number(normalPerf.p95.toFixed(2)),
    minMs: Number(normalPerf.min.toFixed(2)),
    maxMs: Number(normalPerf.max.toFixed(2)),
    estimatedFps: Number(normalPerf.fps.toFixed(1)),
  });

  // Simulated 4x CPU throttling via CDP
  const cdpSession = await perfContext.newCDPSession(perfPage);
  await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await perfPage.waitForTimeout(200);
  const throttledPerf = await measureFrames(perfPage, 120);
  console.log('Simulated 4x CPU Throttled Frame Performance:', {
    avgMs: Number(throttledPerf.avg.toFixed(2)),
    p95Ms: Number(throttledPerf.p95.toFixed(2)),
    minMs: Number(throttledPerf.min.toFixed(2)),
    maxMs: Number(throttledPerf.max.toFixed(2)),
    estimatedFps: Number(throttledPerf.fps.toFixed(1)),
  });
  await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await perfContext.close();

  // 3. Capture all 8 recipes across conditions
  const performanceReport = {
    standard1440px: normalPerf,
    throttled4x: throttledPerf,
  };

  for (const recipeId of recipes) {
    console.log(`\nCapturing recipe: [${recipeId}]`);

    // A. 1440px at t=0 and t=5s
    const ctx1440 = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page1440 = await ctx1440.newPage();
    await page1440.goto(`http://localhost:3000/dev/backgrounds?recipe=${recipeId}&pure=1`, {
      waitUntil: 'networkidle',
    });
    // t=0
    await page1440.screenshot({
      path: path.join(outDir, `${recipeId}_1440px_t0.png`),
    });

    // Cursor corner 1: top-left (144, 90) -> (0.1, 0.1)
    await page1440.mouse.move(144, 90);
    await page1440.waitForTimeout(300); // allow spring attractor to settle
    await page1440.screenshot({
      path: path.join(outDir, `${recipeId}_1440px_cursor_topleft.png`),
    });

    // Cursor corner 2: bottom-right (1296, 810) -> (0.9, 0.9)
    await page1440.mouse.move(1296, 810);
    await page1440.waitForTimeout(300); // allow spring attractor to settle
    await page1440.screenshot({
      path: path.join(outDir, `${recipeId}_1440px_cursor_bottomright.png`),
    });

    // t=+5s: wait until 5000ms elapsed from start
    await page1440.waitForTimeout(4400);
    await page1440.screenshot({
      path: path.join(outDir, `${recipeId}_1440px_t5s.png`),
    });
    await ctx1440.close();

    // B. 390px at t=0 and t=5s
    const ctx390 = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page390 = await ctx390.newPage();
    await page390.goto(`http://localhost:3000/dev/backgrounds?recipe=${recipeId}&pure=1`, {
      waitUntil: 'networkidle',
    });
    // t=0
    await page390.screenshot({
      path: path.join(outDir, `${recipeId}_390px_t0.png`),
    });
    // t=+5s
    await page390.waitForTimeout(5000);
    await page390.screenshot({
      path: path.join(outDir, `${recipeId}_390px_t5s.png`),
    });
    await ctx390.close();

    // C. Reduced motion mode
    const ctxReducedMotion = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    const pageReducedMotion = await ctxReducedMotion.newPage();
    await pageReducedMotion.goto(
      `http://localhost:3000/dev/backgrounds?recipe=${recipeId}&pure=1`,
      { waitUntil: 'networkidle' }
    );
    await pageReducedMotion.waitForTimeout(200);
    await pageReducedMotion.screenshot({
      path: path.join(outDir, `${recipeId}_reduced_motion.png`),
    });
    await ctxReducedMotion.close();
  }

  await browser.close();

  // Save perf JSON
  fs.writeFileSync(
    path.join(outDir, 'perf-summary.json'),
    JSON.stringify(performanceReport, null, 2)
  );

  console.log('\nAll 8 recipes captured across all specified dimensions and conditions.');
  console.log(`Artifacts saved to: ${outDir}`);
}

run().catch((err) => {
  console.error('Capture script error:', err);
  process.exit(1);
});
