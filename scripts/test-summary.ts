import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { assertTestProjectRefAllowed } from '../src/lib/test-utils/production-guard';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
assertTestProjectRefAllowed();

interface CommandResult {
  name: string;
  exitCode: number;
  durationMs: number;
}

interface FileSummary {
  file: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

function runStep(name: string, command: string, extraEnv?: Record<string, string>): CommandResult {
  const start = Date.now();
  const res = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  return {
    name,
    exitCode: res.status ?? 1,
    durationMs: Date.now() - start,
  };
}

function parseVitestJson(jsonPath: string): {
  files: FileSummary[];
  totals: { files: number; total: number; passed: number; failed: number; skipped: number; durationMs: number };
} {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  const root = process.cwd().replace(/\\/g, '/');

  const files: FileSummary[] = (data.testResults || []).map((tr: any) => {
    const assertions = tr.assertionResults || [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    for (const a of assertions) {
      if (a.status === 'passed') passed++;
      else if (a.status === 'failed') failed++;
      else skipped++;
    }
    const rawName = String(tr.name || '').replace(/\\/g, '/');
    const relName = rawName.startsWith(root + '/') ? rawName.slice(root.length + 1) : rawName;
    const durationMs = Math.max(0, Math.round((tr.endTime ?? 0) - (tr.startTime ?? 0)));
    return {
      file: relName,
      total: assertions.length,
      passed,
      failed,
      skipped,
      durationMs,
    };
  });

  files.sort((a, b) => a.file.localeCompare(b.file));

  const totals = {
    files: files.length,
    total: files.reduce((acc, f) => acc + f.total, 0),
    passed: files.reduce((acc, f) => acc + f.passed, 0),
    failed: files.reduce((acc, f) => acc + f.failed, 0),
    skipped: files.reduce((acc, f) => acc + f.skipped, 0),
    durationMs: files.reduce((acc, f) => acc + f.durationMs, 0),
  };

  return { files, totals };
}

function parsePlaywrightJson(jsonPath: string): {
  files: FileSummary[];
  totals: { files: number; total: number; passed: number; failed: number; skipped: number; flaky: number; durationMs: number };
} {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);

  const byFile = new Map<string, FileSummary>();

  function visitSuite(suite: any) {
    for (const spec of suite.specs || []) {
      const file = `e2e/${String(spec.file || suite.file || 'unknown').replace(/\\/g, '/')}`;
      let entry = byFile.get(file);
      if (!entry) {
        entry = { file, total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0 };
        byFile.set(file, entry);
      }
      for (const test of spec.tests || []) {
        entry.total++;
        const results = test.results || [];
        const lastResult = results[results.length - 1];
        const status = test.status;
        if (status === 'expected' || status === 'flaky') {
          entry.passed++;
        } else if (status === 'skipped') {
          entry.skipped++;
        } else {
          entry.failed++;
        }
        for (const r of results) {
          entry.durationMs += Math.round(r.duration || 0);
        }
        if (!lastResult && status !== 'skipped') {
          // no-op, counted above
        }
      }
    }
    for (const child of suite.suites || []) {
      visitSuite(child);
    }
  }

  for (const s of data.suites || []) {
    visitSuite(s);
  }

  const files = Array.from(byFile.values()).sort((a, b) => a.file.localeCompare(b.file));
  const stats = data.stats || {};
  const totals = {
    files: files.length,
    total: files.reduce((acc, f) => acc + f.total, 0),
    passed: files.reduce((acc, f) => acc + f.passed, 0),
    failed: files.reduce((acc, f) => acc + f.failed, 0),
    skipped: files.reduce((acc, f) => acc + f.skipped, 0),
    flaky: Number(stats.flaky || 0),
    durationMs: Math.round(Number(stats.duration || 0)),
  };

  return { files, totals };
}

function formatTable(title: string, files: FileSummary[], totals: any): string {
  const lines: string[] = [];
  lines.push(`### ${title}`);
  lines.push(`| File | Total | Passed | Failed | Skipped | Duration (ms) |`);
  lines.push(`| :--- | ---: | ---: | ---: | ---: | ---: |`);
  for (const f of files) {
    lines.push(`| ${f.file} | ${f.total} | ${f.passed} | ${f.failed} | ${f.skipped} | ${f.durationMs} |`);
  }
  lines.push(
    `| **TOTAL (${totals.files} files)** | **${totals.total}** | **${totals.passed}** | **${totals.failed}** | **${totals.skipped}** | **${totals.durationMs}** |`
  );
  lines.push('');
  return lines.join('\n');
}

function main() {
  const reportsDir = path.resolve(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const typecheckRes = runStep('typecheck', 'npm run typecheck');
  const lintRes = runStep('lint', 'npm run lint');
  const buildRes = runStep('build', 'npm run build');

  const unitJsonPath = path.join(reportsDir, '_unit.json');
  const intJsonPath = path.join(reportsDir, '_integration.json');
  const pwJsonPath = path.join(reportsDir, '_playwright.json');

  for (const p of [unitJsonPath, intJsonPath, pwJsonPath]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  const unitRes = runStep(
    'unit',
    `npx vitest run --reporter=json --outputFile="${unitJsonPath}"`
  );
  const intRes = runStep(
    'integration',
    `npx vitest run --config vitest.integration.config.ts --reporter=json --outputFile="${intJsonPath}"`
  );
  const pwRes = runStep('playwright', `npx playwright test --reporter=json`, {
    PLAYWRIGHT_JSON_OUTPUT_NAME: pwJsonPath,
  });

  const sections: string[] = [];
  sections.push(`QUILLFOLIO VERIFICATION SUMMARY`);
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push('');
  sections.push(`### Command Exit Codes`);
  sections.push(`| Check | Exit Code | Duration (ms) |`);
  sections.push(`| :--- | ---: | ---: |`);
  for (const r of [typecheckRes, lintRes, buildRes, unitRes, intRes, pwRes]) {
    sections.push(`| ${r.name} | ${r.exitCode} | ${r.durationMs} |`);
  }
  sections.push('');

  if (fs.existsSync(unitJsonPath)) {
    const unit = parseVitestJson(unitJsonPath);
    sections.push(formatTable('Unit Tests (Vitest)', unit.files, unit.totals));
  } else {
    sections.push(`### Unit Tests (Vitest)\nJSON report missing: ${unitJsonPath}\n`);
  }

  if (fs.existsSync(intJsonPath)) {
    const integration = parseVitestJson(intJsonPath);
    sections.push(formatTable('Integration Tests (Vitest)', integration.files, integration.totals));
  } else {
    sections.push(`### Integration Tests (Vitest)\nJSON report missing: ${intJsonPath}\n`);
  }

  if (fs.existsSync(pwJsonPath)) {
    const pw = parsePlaywrightJson(pwJsonPath);
    sections.push(formatTable('E2E Tests (Playwright)', pw.files, pw.totals));
    sections.push(`Playwright flaky count: ${pw.totals.flaky}`);
    sections.push('');
  } else {
    sections.push(`### E2E Tests (Playwright)\nJSON report missing: ${pwJsonPath}\n`);
  }

  const summaryText = sections.join('\n');
  const summaryPath = path.join(reportsDir, 'summary.txt');
  fs.writeFileSync(summaryPath, summaryText, 'utf8');

  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(summaryPath)).digest('hex').toUpperCase();

  console.log('\n' + summaryText);
  console.log(`Summary written to: ${summaryPath}`);
  console.log(`SHA-256: ${sha256}`);

  const anyFailed = [typecheckRes, lintRes, buildRes, unitRes, intRes, pwRes].some((r) => r.exitCode !== 0);
  if (anyFailed) {
    process.exit(1);
  }
}

main();
