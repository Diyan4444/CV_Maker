import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const projectRoot = path.resolve(__dirname, '..');
const publicLandingDir = path.join(projectRoot, 'public', 'landing');

console.log('[generate-landing-specimens] Generating landing specimens from real react-pdf templates & pdf.js...');

try {
  execSync('npx playwright test --config playwright.specimens.config.ts', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: { ...process.env },
  });

  const files = ['ats_single_column.png', 'modern_professional.png', 'academic_cv.png'];
  for (const file of files) {
    const filePath = path.join(publicLandingDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Expected specimen file ${file} was not generated at ${filePath}`);
    }
    const stat = fs.statSync(filePath);
    const sizeKb = Math.round((stat.size / 1024) * 10) / 10;
    console.log(`[Verified Specimen] ${file}: ${stat.size} bytes (${sizeKb} KB)`);
    if (stat.size > 150 * 1024) {
      throw new Error(`Specimen ${file} exceeds 150KB budget: ${sizeKb} KB`);
    }
  }

  console.log('[generate-landing-specimens] All specimens verified under 150 KB in public/landing/.');
} catch (err: any) {
  console.error('[generate-landing-specimens Error]', err?.message || err);
  process.exit(1);
}
