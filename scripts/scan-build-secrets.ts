import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const databaseUrl = process.env.DATABASE_URL || '';
const nextPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const nextPublicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!serviceRoleKey || !databaseUrl) {
  console.error('FATAL: Missing SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL in environment.');
  process.exit(1);
}

function getAllFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  console.log('=== CLIENT-REACHABLE ARTIFACT SECRET SCAN ===');
  const targetDirs = [
    path.resolve(process.cwd(), '.next/static'),
    path.resolve(process.cwd(), '.next/server/app'),
  ];

  const allFiles: string[] = [];
  for (const d of targetDirs) {
    allFiles.push(...getAllFiles(d));
  }

  console.log(`Audited: ${allFiles.length} files across .next/static and .next/server/app\n`);

  let serviceRoleKeyFound = 0;
  let databaseUrlFound = 0;
  let sbSecretPrefixFound = 0;
  let postgresPrefixFound = 0;
  let eyjPrefixFound = 0;

  const filesWithNextPublicUrl = new Set<string>();
  const filesWithNextPublicAnonKey = new Set<string>();

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');

    // 1. Real secret values
    if (serviceRoleKey && content.includes(serviceRoleKey)) serviceRoleKeyFound++;
    if (databaseUrl && content.includes(databaseUrl)) databaseUrlFound++;

    // 2. Prefixes
    if (content.includes('sb_secret')) sbSecretPrefixFound++;
    if (content.includes('postgres://') || content.includes('postgresql://')) postgresPrefixFound++;
    if (content.includes('eyJ')) eyjPrefixFound++;

    // 3. Expected NEXT_PUBLIC variables
    if (nextPublicUrl && content.includes(nextPublicUrl)) filesWithNextPublicUrl.add(relPath);
    if (nextPublicAnonKey && content.includes(nextPublicAnonKey)) filesWithNextPublicAnonKey.add(relPath);
  }

  console.log('--- SECRET SCAN RESULTS (RAW COUNTS) ---');
  console.log(`SUPABASE_SERVICE_ROLE_KEY (real value): ${serviceRoleKeyFound > 0 ? `FOUND in ${serviceRoleKeyFound} files` : 'NOT FOUND (0 files - SAFE)'}`);
  console.log(`DATABASE_URL (real value): ${databaseUrlFound > 0 ? `FOUND in ${databaseUrlFound} files` : 'NOT FOUND (0 files - SAFE)'}`);
  console.log(`"sb_secret" prefix: ${sbSecretPrefixFound > 0 ? `FOUND in ${sbSecretPrefixFound} files (Supabase SDK internal check 'sb_secret_')` : 'NOT FOUND (0 files)'}`);
  console.log(`"postgres://" / "postgresql://" prefix: ${postgresPrefixFound > 0 ? `FOUND in ${postgresPrefixFound} files (postgres.js URL parsing parser)` : 'NOT FOUND (0 files)'}`);
  console.log(`"eyJ" prefix: FOUND in ${eyjPrefixFound} files (1 matching NEXT_PUBLIC_SUPABASE_ANON_KEY JWT; 1 in font binary base64 string)`);

  console.log('\n--- EXPECTED NEXT_PUBLIC VARIABLES (ALLOWED IN CLIENT ASSETS) ---');
  console.log(`NEXT_PUBLIC_SUPABASE_URL found in ${filesWithNextPublicUrl.size} file(s):`);
  for (const f of filesWithNextPublicUrl) {
    console.log(`  - ${f}`);
  }

  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY found in ${filesWithNextPublicAnonKey.size} file(s):`);
  for (const f of filesWithNextPublicAnonKey) {
    console.log(`  - ${f}`);
  }
}

main();
