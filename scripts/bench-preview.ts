import { chromium } from 'playwright';

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
    args: ['--enable-precise-memory-info', '--no-sandbox', '--js-flags=--expose-gc'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  // Navigate to dev template gallery
  await page.goto('http://localhost:3000/dev/templates', { waitUntil: 'networkidle' });
  await page.waitForSelector('#benchmark-live-edit-input');
  await page.waitForSelector('#pdf-preview-canvas-container canvas', { timeout: 15000 });

  // --------------------------------------------------------------------------
  // PART 4(c): 1-Page Fixture Repeated 3 Times to Investigate Outliers
  // --------------------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log('PART 4(c): 1-PAGE FIXTURE 3 REPEATED RUNS (20 EDITS EACH)');
  console.log('='.repeat(70));

  await page.locator('button:has-text("1-Page Industry Resume")').first().click();
  await page.waitForTimeout(1000);

  const input = page.locator('#benchmark-live-edit-input');

  for (let runIdx = 1; runIdx <= 3; runIdx++) {
    console.log(`\n>>> 1-Page Fixture Run ${runIdx}/3 (20 Edits) <<<`);
    await input.fill('');
    await page.waitForTimeout(600);

    const samples: number[] = [];
    const NUM_EDITS = 20;

    for (let i = 1; i <= NUM_EDITS; i++) {
      const initialVersion = await page.evaluate(() => {
        const c = document.getElementById('pdf-preview-canvas-container');
        return parseInt(c?.getAttribute('data-rendered-version') || '0', 10);
      });

      const t0 = performance.now();
      await input.pressSequentially('X', { delay: 0 });

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
      process.stdout.write(`Edit ${i}: ${duration}ms | `);
      if (i % 5 === 0) console.log();

      await page.waitForTimeout(60);
    }

    const p50 = Math.round(quantile(samples, 0.5));
    const p95 = Math.round(quantile(samples, 0.95));
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const mean = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);

    console.log(`Run ${runIdx} Summary: Min: ${min}ms | Mean: ${mean}ms | Max: ${max}ms | p50: ${p50}ms | p95: ${p95}ms`);
  }

  // --------------------------------------------------------------------------
  // PART 4(a): Long Tasks (>50ms) During Burst Typing with Pauses
  // --------------------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log('PART 4(a): LONG TASKS (>50ms) DURING BURST TYPING WITH PAUSES');
  console.log('='.repeat(70));

  await input.fill('');
  await page.waitForTimeout(600);

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

  console.log('Simulating 15 typing bursts (3 keys each) followed by 500ms pauses to trigger generation...');
  for (let burst = 1; burst <= 15; burst++) {
    await input.pressSequentially('abc', { delay: 30 });
    // Pause 500ms to allow 250ms debounce to fire and PDF compilation to run
    await page.waitForTimeout(500);
  }

  // Wait 1s for settle
  await page.waitForTimeout(1000);

  const longTasks = await page.evaluate(() => {
    return (window as any).__longTasks || [];
  });

  console.log(`Total typing bursts: 15 (45 keystrokes total, generation fired 15 times)`);
  console.log(`Long tasks (>50ms) detected: ${longTasks.length}`);
  if (longTasks.length > 0) {
    const totalDuration = longTasks.reduce((acc: number, t: any) => acc + t.duration, 0);
    const maxDuration = Math.max(...longTasks.map((t: any) => t.duration));
    console.log(`Long tasks breakdown:`);
    console.log(`  Total long task duration: ${totalDuration}ms`);
    console.log(`  Max long task duration: ${maxDuration}ms`);
    console.log(`  Individual task durations: ${longTasks.map((t: any) => t.duration + 'ms').join(', ')}`);
  } else {
    console.log(`  Zero tasks exceeded 50ms threshold during burst typing.`);
  }

  // --------------------------------------------------------------------------
  // PART 4(b): Heap Memory over 200 Edits with Forced CDP Garbage Collection
  // --------------------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log('PART 4(b): HEAP TREND OVER 200 EDITS (FORCED CDP GC PER 50 EDITS)');
  console.log('='.repeat(70));

  await input.fill('');
  await page.waitForTimeout(600);

  // Baseline GC
  await cdp.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(200);

  const getHeapMB = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(200);
    const bytes = await page.evaluate(() => {
      const mem = (performance as any).memory;
      return mem ? mem.usedJSHeapSize : null;
    });
    return bytes ? Number((bytes / (1024 * 1024)).toFixed(2)) : null;
  };

  const heapBaseline = await getHeapMB();
  console.log(`Heap at 0 edits (Baseline after GC): ${heapBaseline} MB`);

  const checkpoints = [50, 100, 150, 200];
  let totalEditsDone = 0;

  for (const cp of checkpoints) {
    const editsToRun = cp - totalEditsDone;
    process.stdout.write(`Running edits ${totalEditsDone + 1} to ${cp}... `);

    for (let e = 1; e <= editsToRun; e++) {
      const initialVer = await page.evaluate(() => {
        const c = document.getElementById('pdf-preview-canvas-container');
        return parseInt(c?.getAttribute('data-rendered-version') || '0', 10);
      });

      await input.pressSequentially('z', { delay: 0 });

      // Settle every 5 edits so preview compiles
      if (e % 5 === 0) {
        await page.waitForFunction(
          (prevVer) => {
            const c = document.getElementById('pdf-preview-canvas-container');
            const currentVer = parseInt(c?.getAttribute('data-rendered-version') || '0', 10);
            const isCompiling = c?.getAttribute('data-compiling') === 'true';
            return currentVer > prevVer && !isCompiling;
          },
          initialVer,
          { timeout: 15000 }
        );
      }
    }

    totalEditsDone = cp;
    await page.waitForTimeout(500);

    const heapAtCheckpoint = await getHeapMB();
    const deltaFromBaseline = heapBaseline && heapAtCheckpoint ? (heapAtCheckpoint - heapBaseline).toFixed(2) : 'N/A';
    console.log(`\n  -> Heap at ${cp} edits (after GC): ${heapAtCheckpoint} MB (Delta from baseline: ${deltaFromBaseline} MB)`);
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
