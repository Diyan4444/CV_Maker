import fs from 'node:fs';
import path from 'node:path';

function getExactDiskPath(targetPath: string): string[] {
  const segments = path.normalize(targetPath).split(path.sep).filter(Boolean);
  let current = path.parse(path.resolve(targetPath)).root;
  const actualSegments: string[] = [];

  for (const seg of segments) {
    if (seg.includes(':')) {
      actualSegments.push(seg);
      current = seg + path.sep;
      continue;
    }
    if (!fs.existsSync(current)) break;
    const entries = fs.readdirSync(current);
    const exact = entries.find((e) => e.toLowerCase() === seg.toLowerCase());
    if (exact) {
      actualSegments.push(exact);
      current = path.join(current, exact);
    } else {
      actualSegments.push(seg);
      current = path.join(current, seg);
    }
  }

  return actualSegments;
}

function verifyImportCasing(filePath: string): Array<{ importPath: string; expected: string; actual: string }> {
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /(?:from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
  const errors: Array<{ importPath: string; expected: string; actual: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const importStr = match[1] || match[2] || match[3];
    if (!importStr) continue;

    // Only check local files (starting with . or @/)
    if (!importStr.startsWith('.') && !importStr.startsWith('@/')) continue;

    let resolvedPath = '';
    if (importStr.startsWith('@/')) {
      resolvedPath = path.resolve(process.cwd(), 'src', importStr.slice(2));
    } else {
      resolvedPath = path.resolve(path.dirname(filePath), importStr);
    }

    // Resolve extension (.ts, .tsx, /index.ts, etc.)
    const candidates = [
      resolvedPath,
      resolvedPath + '.ts',
      resolvedPath + '.tsx',
      resolvedPath + '.js',
      resolvedPath + '.mjs',
      path.join(resolvedPath, 'index.ts'),
      path.join(resolvedPath, 'index.tsx'),
    ];

    const found = candidates.find((c) => fs.existsSync(c));
    if (!found) continue;

    const actualSegments = getExactDiskPath(found);
    const resolvedSegments = found.split(path.sep).filter(Boolean);

    // Compare segment casing
    for (let i = 0; i < resolvedSegments.length; i++) {
      if (actualSegments[i] && actualSegments[i] !== resolvedSegments[i]) {
        errors.push({
          importPath: importStr,
          expected: actualSegments[i],
          actual: resolvedSegments[i],
        });
      }
    }
  }

  return errors;
}

function scanDir(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDir(full, fileList);
      }
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      fileList.push(full);
    }
  }
  return fileList;
}

async function main() {
  const srcFiles = scanDir(path.resolve(process.cwd(), 'src'));
  const e2eFiles = scanDir(path.resolve(process.cwd(), 'e2e'));
  const scriptFiles = scanDir(path.resolve(process.cwd(), 'scripts'));
  const allFiles = [...srcFiles, ...e2eFiles, ...scriptFiles];

  console.log(`[check-casing] Auditing case-sensitivity across ${allFiles.length} files...`);

  let errorCount = 0;
  for (const file of allFiles) {
    const errs = verifyImportCasing(file);
    if (errs.length > 0) {
      console.error(`Case mismatch in ${path.relative(process.cwd(), file)}:`);
      for (const e of errs) {
        console.error(`  Import: "${e.importPath}" -> casing "${e.actual}" does not match disk "${e.expected}"`);
      }
      errorCount += errs.length;
    }
  }

  if (errorCount === 0) {
    console.log(`[check-casing] SUCCESS: Zero case-sensitivity mismatches found across all ${allFiles.length} files.`);
  } else {
    console.error(`[check-casing] FAILED: Found ${errorCount} case-sensitivity issues.`);
    process.exit(1);
  }
}

main();
