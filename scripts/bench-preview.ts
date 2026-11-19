import { chromium } from 'playwright';

interface MetricResult {
  fixture: string;
  samples: number[];
  p50: number;
  p95: number;
  min: number;
  max: number;
  mean: number;
}

function quantile(arr: number[], q: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

async function runPreviewBenchmark() {
  console.log('='.repeat(70));
  console.log('PREVIEW PERFORMANCE BENCHMARK (scripts/bench-preview.ts)');
  console.log('Metric: End-to-end latency (ms) from keystroke in editor input');
  console.log('        to preview canvas repainted with new content (incl. 250ms debounce)');
  console.log('='.repeat(70));

  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-precise-memory-info', '--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Navigate to dev template gallery
  await page.goto('http://localhost:3000/dev/templates', { waitUntil: 'networkidle' });
  await page.waitForSelector('#benchmark-live-edit-input');
  await page.waitForSelector('#pdf-preview-canvas-container canvas', { timeout: 15000 });

  const fixtures = [
    { id: '1page', name: '1-Page Industry Resume' },
    { id: '2page', name: '2-Page Senior Engineer Resume' },
    { id: 'extreme', name: 'Extreme Edge Case' },
  ];

  const results: MetricResult[] = [];

  for (const fix of fixtures) {
    console.log(`\n--- Benchmarking Fixture: ${fix.name} (${fix.id}) ---`);

    // Switch to fixture
    const fixtureBtn = page.locator(`button:has-text("${fix.name}")`).first();
    await fixtureBtn.click();
    await page.waitForTimeout(1000); // Wait for initial render to settle

    // Reset input
    const input = page.locator('#benchmark-live-edit-input');
    await input.fill('');
    await page.waitForTimeout(500);

    const samples: number[] = [];
    const NUM_EDITS = 20;

    for (let i = 1; i <= NUM_EDITS; i++) {
      const initialVersion = await page.evaluate(() => {
        const c = document.getElementById('pdf-preview-canvas-container');
        return parseInt(c?.getAttribute('data-rendered-version') || '0', 10);
      });

      const t0 = performance.now();

      // Type single character
      await input.pressSequentially(`X`, { delay: 0 });

      // Wait until canvas has re-rendered to a newer version and compiling finished
      await page.waitForFunction(
        (prevVer) => {
          const c = document.getElementById('pdf-preview-canvas-container');
          const currentVer = parseInt(c?.getAttribute('data-rendered-version') || '0', 10);
          const isCompiling = c?.getAttribute('data-compiling') === 'true';
          return currentVer > prevVer && !isCompiling;
        },
        initialVersion,
        { timeout: 15000 }
      );

      const t1 = performance.now();
      const duration = Math.round(t1 - t0);
      samples.push(duration);
      process.stdout.write(`Edit ${i}/${NUM_EDITS}: ${duration}ms | `);
      if (i % 5 === 0) console.log();

      // Small pause between edits
      await page.waitForTimeout(60);
    }

    const p50 = Math.round(quantile(samples, 0.5));
    const p95 = Math.round(quantile(samples, 0.95));
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const mean = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);

    results.push({
      fixture: fix.name,
      samples,
      p50,
      p95,
      min,
      max,
      mean,
    });

    console.log(`\nSummary for ${fix.name}:`);
    console.log(`  Min: ${min}ms | Mean: ${mean}ms | Max: ${max}ms`);
    console.log(`  p50: ${p50}ms | p95: ${p95}ms`);
  }

  // --- Long tasks benchmark during 20 seconds of continuous typing ---
  console.log('\n' + '='.repeat(70));
  console.log('LONG TASKS BENCHMARK (>50ms via PerformanceObserver during 20s typing)');
  console.log('='.repeat(70));

  // Switch to 1-page fixture for continuous typing test
  await page.locator('button:has-text("1-Page Industry Resume")').first().click();
  await page.waitForTimeout(800);

  // Setup PerformanceObserver for longtask
  await page.evaluate(() => {
    (window as any).__longTasks = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          (window as any).__longTasks.push({
            name: entry.name,
            duration: Math.round(entry.duration),
            startTime: Math.round(entry.startTime),
          });
        }
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
  });

  const input = page.locator('#benchmark-live-edit-input');
  await input.fill('');

  const startTime = Date.now();
  const DURATION_MS = 20000;
  let keystrokesCount = 0;

  console.log(`Typing continuously for 20 seconds (~1 key every 180ms)...`);
  while (Date.now() - startTime < DURATION_MS) {
    await input.pressSequentially('a', { delay: 0 });
    keystrokesCount++;
    await page.waitForTimeout(180);
  }

  // Wait 1s for any final rendering task to complete
  await page.waitForTimeout(1000);

  const longTasks = await page.evaluate(() => {
    return (window as any).__longTasks || [];
  });

  console.log(`Total keystrokes in 20s: ${keystrokesCount}`);
  console.log(`Long tasks (>50ms) detected: ${longTasks.length}`);
  if (longTasks.length > 0) {
    const totalDuration = longTasks.reduce((acc: number, t: any) => acc + t.duration, 0);
    const maxDuration = Math.max(...longTasks.map((t: any) => t.duration));
    console.log(`Long tasks breakdown:`);
    console.log(`  Total long task time: ${totalDuration}ms`);
    console.log(`  Max long task duration: ${maxDuration}ms`);
    console.log(`  Individual task durations: ${longTasks.map((t: any) => t.duration + 'ms').join(', ')}`);
  } else {
    console.log(`  Zero tasks exceeded 50ms threshold during 20s typing.`);
  }

  // --- Memory Heap Benchmark before and after 50 edits ---
  console.log('\n' + '='.repeat(70));
  console.log('HEAP MEMORY BENCHMARK (before & after 50 sequential edits)');
  console.log('='.repeat(70));

  const initialHeapBytes = await page.evaluate(() => {
    const mem = (performance as any).memory;
    return mem ? mem.usedJSHeapSize : null;
  });

  console.log(`Executing 50 sequential edits...`);
  for (let j = 1; j <= 50; j++) {
    await input.pressSequentially('z', { delay: 0 });
    if (j % 10 === 0) {
      await page.waitForTimeout(300); // Let debounce cycle execute
    }
  }

  // Wait for settle
  await page.waitForTimeout(1000);

  const finalHeapBytes = await page.evaluate(() => {
    const mem = (performance as any).memory;
    return mem ? mem.usedJSHeapSize : null;
  });

  if (initialHeapBytes && finalHeapBytes) {
    const initialMB = (initialHeapBytes / (1024 * 1024)).toFixed(2);
    const finalMB = (finalHeapBytes / (1024 * 1024)).toFixed(2);
    const deltaMB = ((finalHeapBytes - initialHeapBytes) / (1024 * 1024)).toFixed(2);
    console.log(`Heap before 50 edits: ${initialMB} MB (${initialHeapBytes} bytes)`);
    console.log(`Heap after 50 edits:  ${finalMB} MB (${finalHeapBytes} bytes)`);
    console.log(`Heap delta:          ${deltaMB} MB`);
  } else {
    console.log(`performance.memory API unavailable in this browser context.`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('BENCHMARK COMPLETE');
  console.log('='.repeat(70));

  await browser.close();
}

runPreviewBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
