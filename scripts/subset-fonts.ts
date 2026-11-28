/**
 * Font Subsetting Script for Quillfolio
 *
 * Tooling: Uses Python `fonttools` (`pyftsubset`) on Windows/macOS/Linux (no new Node runtime dependency).
 * Prerequisite: `pip install fonttools` (verified on Windows Python 3.14.6).
 *
 * Subsets Noto Sans and Noto Serif (Regular, Bold, Italic, BoldItalic) from OFL sources to:
 * - Basic Latin (U+0020-007E)
 * - Latin-1 Supplement (U+00A0-00FF)
 * - Latin Extended-A (U+0100-017F)
 * - Latin Extended-B (U+0180-024F)
 * - Latin Extended Additional / Vietnamese (U+1E00-1EFF)
 * - General Punctuation (U+2000-206F: en/em dashes, curly quotes, bullet U+2022, ellipsis, etc.)
 * - Currency Symbols (U+20A0-20CF)
 * - Arrows (U+2190-21FF)
 * - Additional bullet/dash/math/check glyphs used in templates (U+2212, U+25AA-25FF, U+2713)
 *
 * Preserves kerning & OpenType layout features (`--layout-features=*`).
 * Outputs `.woff` (smallest format supported in both browser and Node by @react-pdf/renderer / fontkit).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const FONT_DIR = path.resolve(process.cwd(), 'public/fonts');

const UNICODE_RANGES = [
  'U+0020-007E', // Basic Latin
  'U+00A0-00FF', // Latin-1 Supplement
  'U+0100-017F', // Latin Extended-A
  'U+0180-024F', // Latin Extended-B
  'U+1E00-1EFF', // Latin Extended Additional (Vietnamese)
  'U+2000-206F', // General Punctuation (dashes, quotes, bullets)
  'U+20A0-20CF', // Currency Symbols
  'U+2190-21FF', // Arrows
  'U+2212',      // Minus sign
  'U+25AA-25FF', // Geometric shapes / bullets
  'U+2713',      // Check mark
].join(',');

const FONT_BASES = [
  'NotoSans-Regular',
  'NotoSans-Bold',
  'NotoSans-Italic',
  'NotoSans-BoldItalic',
  'NotoSerif-Regular',
  'NotoSerif-Bold',
  'NotoSerif-Italic',
  'NotoSerif-BoldItalic',
];

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function main() {
  // Verify pyftsubset is available
  try {
    execFileSync('pyftsubset', ['--help'], { stdio: 'pipe' });
  } catch {
    console.error('Error: `pyftsubset` (fonttools) not found on PATH. Install with `pip install fonttools`.');
    process.exit(1);
  }

  console.log('Subsetting Noto Sans & Noto Serif fonts with pyftsubset...');
  console.log('| Font | Original TTF | Subset TTF | Subset WOFF | Savings (WOFF vs Orig) |');
  console.log('|:---|---:|---:|---:|---:|');

  for (const base of FONT_BASES) {
    const srcTtf = path.join(FONT_DIR, `${base}.ttf`);
    if (!fs.existsSync(srcTtf)) {
      console.error(`Missing source TTF: ${srcTtf}. Run download-noto.ts first.`);
      process.exit(1);
    }

    const origSize = fs.statSync(srcTtf).size;
    const tmpTtf = path.join(FONT_DIR, `${base}.subset.tmp.ttf`);
    const outWoff = path.join(FONT_DIR, `${base}.woff`);

    execFileSync(
      'pyftsubset',
      [
        srcTtf,
        `--unicodes=${UNICODE_RANGES}`,
        '--layout-features=*',
        `--output-file=${tmpTtf}`,
      ],
      { stdio: 'pipe' }
    );
    const subTtfSize = fs.statSync(tmpTtf).size;
    fs.unlinkSync(tmpTtf);

    execFileSync(
      'pyftsubset',
      [
        srcTtf,
        `--unicodes=${UNICODE_RANGES}`,
        '--layout-features=*',
        '--flavor=woff',
        `--output-file=${outWoff}`,
      ],
      { stdio: 'pipe' }
    );
    const woffSize = fs.statSync(outWoff).size;

    const savings = (((origSize - woffSize) / origSize) * 100).toFixed(1);
    console.log(
      `| ${base} | ${formatKB(origSize)} | ${formatKB(subTtfSize)} | ${formatKB(woffSize)} | -${savings}% |`
    );
  }
}

main();
