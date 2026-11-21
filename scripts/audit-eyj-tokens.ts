import fs from 'node:fs';
import path from 'node:path';

function findFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, fileList);
    } else {
      fileList.push(full);
    }
  }
  return fileList;
}

function decodeBase64(str: string): string {
  try {
    return Buffer.from(str, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

const dirs = ['.next/static', '.next/server/app'];
const allFiles: string[] = [];
for (const d of dirs) findFiles(d, allFiles);

console.log(`Auditing ${allFiles.length} files across ${dirs.join(', ')}...`);

const results: any[] = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('eyJ')) continue;

  // Regex to match potential JWT tokens: eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+
  // Or base64 strings starting with eyJ
  const jwtRegex = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  const jwtMatches = content.match(jwtRegex) || [];

  // Also check for standalone eyJ... strings (e.g. JSON base64 encoded strings)
  const base64Regex = /eyJ[A-Za-z0-9+/=_-]{10,}/g;
  const b64Matches = content.match(base64Regex) || [];

  const fileTokens: any[] = [];

  for (const match of jwtMatches) {
    const parts = match.split('.');
    if (parts.length === 3) {
      const payloadRaw = decodeBase64(parts[1]);
      try {
        const payload = JSON.parse(payloadRaw);
        fileTokens.push({
          type: 'JWT',
          role: payload.role || 'NONE',
          ref: payload.ref || payload.app_metadata?.provider || 'NONE',
          iss: payload.iss || 'NONE',
          sub: payload.sub || 'NONE',
          exp: payload.exp || 'NONE',
        });
      } catch {
        fileTokens.push({ type: 'JWT_INVALID_JSON', payloadRaw });
      }
    }
  }

  // Non-JWT base64 matches that start with eyJ
  const nonJwtB64: string[] = [];
  for (const b64 of b64Matches) {
    if (jwtMatches.some(jwt => jwt.includes(b64))) continue; // part of a JWT
    const decoded = decodeBase64(b64);
    if (decoded && (decoded.startsWith('{') || decoded.startsWith('['))) {
      nonJwtB64.push(decoded.slice(0, 100)); // preview
    } else {
      nonJwtB64.push(`[Binary/Non-JSON raw]: ${decoded.slice(0, 40)}`);
    }
  }

  results.push({
    file: path.relative(process.cwd(), file),
    jwtTokens: fileTokens,
    nonJwtBase64Count: nonJwtB64.length,
    nonJwtPreviews: nonJwtB64.slice(0, 3)
  });
}

console.log('--- JWT & eyJ AUDIT RESULTS ---');
for (const r of results) {
  console.log(`\nFile: ${r.file}`);
  if (r.jwtTokens.length > 0) {
    console.log(`  JWT Tokens found (${r.jwtTokens.length}):`);
    for (const t of r.jwtTokens) {
      console.log(`    - Type: ${t.type}, Role: "${t.role}", Ref: "${t.ref}", Iss: "${t.iss}"`);
    }
  } else {
    console.log(`  JWT Tokens: 0`);
  }
  if (r.nonJwtBase64Count > 0) {
    console.log(`  Non-JWT base64 strings starting with eyJ: ${r.nonJwtBase64Count}`);
    for (const p of r.nonJwtPreviews) {
      console.log(`    Preview: ${JSON.stringify(p)}`);
    }
  }
}
